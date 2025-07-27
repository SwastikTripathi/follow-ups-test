
-- Drop the existing functions to ensure a clean state
DROP FUNCTION IF EXISTS public.create_full_job_opening(uuid, text, text, text, text, text, boolean, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.update_new_job_opening(uuid, uuid, text, uuid, text, text, text, text, text, boolean, jsonb, jsonb);

-- Recreate create_full_job_opening with the exception block restored
CREATE OR REPLACE FUNCTION public.create_full_job_opening(
    p_user_id uuid,
    p_company_name text,
    p_role_title text,
    p_initial_email_date text,
    p_job_description_url text,
    p_notes text,
    p_is_favorite boolean,
    p_contact_inputs jsonb,
    p_follow_up_inputs jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
    v_contact_id uuid;
    v_job_opening_id uuid;
    contact_input jsonb;
    follow_up_input jsonb;
    v_follow_up_date timestamptz;
    v_status_to_set text := 'Emailed';
    temp_email text;
    temp_linkedin text;
    temp_phone text;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    -- 1. Handle Company
    IF p_company_name IS NOT NULL AND trim(p_company_name) <> '' THEN
        SELECT id INTO v_company_id
        FROM public.companies
        WHERE lower(name) = lower(trim(p_company_name)) AND user_id = p_user_id;

        IF v_company_id IS NULL THEN
            INSERT INTO public.companies (user_id, name, is_favorite)
            VALUES (p_user_id, trim(p_company_name), false)
            RETURNING id INTO v_company_id;
        END IF;
    ELSE
        v_company_id := NULL;
    END IF;

    -- 2. Insert Job Opening
    INSERT INTO public.job_openings (
        user_id, company_id, company_name_cache, role_title, initial_email_date,
        job_description_url, notes, is_favorite, status
    )
    VALUES (
        p_user_id, v_company_id, trim(p_company_name), p_role_title, p_initial_email_date::timestamptz,
        p_job_description_url, p_notes, COALESCE(p_is_favorite, false), v_status_to_set
    )
    RETURNING id INTO v_job_opening_id;

    -- 3. Handle Contacts
    IF p_contact_inputs IS NOT NULL AND jsonb_array_length(p_contact_inputs) > 0 THEN
        FOR contact_input IN SELECT * FROM jsonb_array_elements(p_contact_inputs)
        LOOP
            v_contact_id := NULL;
            temp_email := trim(contact_input->>'email');
            temp_linkedin := trim(contact_input->>'linkedin_url');
            temp_phone := trim(contact_input->>'phone');

            IF temp_email IS NOT NULL AND temp_email <> '' THEN
                SELECT id INTO v_contact_id
                FROM public.contacts
                WHERE lower(email) = lower(temp_email) AND user_id = p_user_id;

                IF v_contact_id IS NOT NULL THEN
                    UPDATE public.contacts
                    SET
                        name = COALESCE(trim(contact_input->>'name'), name),
                        linkedin_url = COALESCE(CASE WHEN temp_linkedin = '' THEN NULL ELSE temp_linkedin END, linkedin_url),
                        phone = COALESCE(CASE WHEN temp_phone = '' THEN NULL ELSE temp_phone END, phone),
                        company_id = COALESCE(v_company_id, company_id),
                        company_name_cache = COALESCE(trim(p_company_name), company_name_cache)
                    WHERE id = v_contact_id AND user_id = p_user_id;
                END IF;
            END IF;

            IF v_contact_id IS NULL THEN
                INSERT INTO public.contacts (
                    user_id, name, email, linkedin_url, phone,
                    company_id, company_name_cache, is_favorite
                )
                VALUES (
                    p_user_id,
                    trim(contact_input->>'name'),
                    CASE WHEN temp_email = '' THEN NULL ELSE temp_email END,
                    CASE WHEN temp_linkedin = '' THEN NULL ELSE temp_linkedin END,
                    CASE WHEN temp_phone = '' THEN NULL ELSE temp_phone END,
                    v_company_id,
                    trim(p_company_name),
                    false
                )
                RETURNING id INTO v_contact_id;
            END IF;

            IF v_contact_id IS NOT NULL THEN
                INSERT INTO public.job_opening_contacts (user_id, job_opening_id, contact_id)
                VALUES (p_user_id, v_job_opening_id, v_contact_id);
            END IF;
        END LOOP;
    END IF;

    -- 4. Handle Follow-ups
    IF p_follow_up_inputs IS NOT NULL AND jsonb_array_length(p_follow_up_inputs) > 0 THEN
        FOR follow_up_input IN SELECT * FROM jsonb_array_elements(p_follow_up_inputs)
        LOOP
            IF follow_up_input->>'due_days_offset' IS NOT NULL THEN
                v_follow_up_date := p_initial_email_date::timestamptz + ((follow_up_input->>'due_days_offset')::integer * interval '1 day');
                INSERT INTO public.follow_ups (
                    user_id, job_opening_id, follow_up_date, original_due_date,
                    email_subject, email_body, status
                )
                VALUES (
                    p_user_id, v_job_opening_id, v_follow_up_date, v_follow_up_date,
                    (follow_up_input->>'subject'), (follow_up_input->>'body'), 'Pending'
                );
            END IF;
        END LOOP;
    END IF;

    RETURN v_job_opening_id;

EXCEPTION
    WHEN others THEN
        RAISE WARNING 'An error occurred in create_full_job_opening: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RETURN NULL;
END;
$$;


-- Recreate update_new_job_opening with the exception block restored
CREATE OR REPLACE FUNCTION public.update_new_job_opening(
    p_user_id uuid,
    p_job_opening_id uuid,
    p_company_name text,
    p_company_id uuid,
    p_role_title text,
    p_initial_email_date text,
    p_status text,
    p_job_description_url text,
    p_notes text,
    p_is_favorite boolean,
    p_contact_inputs jsonb,
    p_follow_up_inputs jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resolved_company_id UUID;
    final_company_name_cache TEXT;
    contact_input RECORD;
    resolved_contact_id UUID;
    follow_up_input RECORD;
    follow_up_due_date TIMESTAMPTZ;
    original_follow_up_due_date TIMESTAMPTZ;
    current_is_favorite BOOLEAN;
    temp_email TEXT;
    temp_linkedin TEXT;
    temp_phone TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    -- 1. Resolve Company ID and Name Cache
    IF p_company_id IS NOT NULL THEN
        resolved_company_id := p_company_id;
        SELECT name INTO final_company_name_cache FROM public.companies WHERE id = resolved_company_id AND user_id = p_user_id;
        IF final_company_name_cache IS NULL THEN
            final_company_name_cache := COALESCE(NULLIF(TRIM(p_company_name), ''), 'Unknown Company');
        END IF;
    ELSIF p_company_name IS NOT NULL AND TRIM(p_company_name) <> '' THEN
        final_company_name_cache := TRIM(p_company_name);
        SELECT id INTO resolved_company_id
        FROM public.companies
        WHERE lower(name) = lower(final_company_name_cache) AND user_id = p_user_id
        LIMIT 1;
        IF resolved_company_id IS NULL THEN
            INSERT INTO public.companies (user_id, name, is_favorite)
            VALUES (p_user_id, final_company_name_cache, false)
            RETURNING id INTO resolved_company_id;
        END IF;
    ELSE
        resolved_company_id := NULL;
        final_company_name_cache := 'N/A';
    END IF;

    -- Get current is_favorite status before update
    SELECT jo.is_favorite INTO current_is_favorite
    FROM public.job_openings jo
    WHERE jo.id = p_job_opening_id AND jo.user_id = p_user_id;

    -- 2. Update Job Opening
    UPDATE public.job_openings
    SET
        company_id = resolved_company_id,
        company_name_cache = final_company_name_cache,
        role_title = p_role_title,
        initial_email_date = p_initial_email_date::timestamptz,
        status = p_status,
        job_description_url = p_job_description_url,
        notes = p_notes,
        is_favorite = p_is_favorite,
        favorited_at = CASE
                         WHEN p_is_favorite AND (COALESCE(current_is_favorite, false) IS DISTINCT FROM TRUE) THEN NOW()
                         WHEN NOT p_is_favorite THEN NULL
                         ELSE favorited_at
                       END
    WHERE id = p_job_opening_id AND user_id = p_user_id;

    -- 3. Manage Contacts
    DELETE FROM public.job_opening_contacts
    WHERE job_opening_id = p_job_opening_id AND user_id = p_user_id;

    IF p_contact_inputs IS NOT NULL AND jsonb_array_length(p_contact_inputs) > 0 THEN
        FOR contact_input IN SELECT * FROM jsonb_to_recordset(p_contact_inputs) AS x(id UUID, name TEXT, email TEXT, linkedin_url TEXT, phone TEXT)
        LOOP
            resolved_contact_id := NULL;
            temp_email := trim(contact_input.email);
            temp_linkedin := trim(contact_input.linkedin_url);
            temp_phone := trim(contact_input.phone);

            IF contact_input.id IS NOT NULL THEN
                SELECT c.id INTO resolved_contact_id FROM public.contacts c WHERE c.id = contact_input.id AND c.user_id = p_user_id;
                IF resolved_contact_id IS NOT NULL THEN
                    UPDATE public.contacts
                    SET
                        name = TRIM(contact_input.name),
                        email = CASE WHEN temp_email = '' THEN NULL ELSE temp_email END,
                        linkedin_url = CASE WHEN temp_linkedin = '' THEN NULL ELSE temp_linkedin END,
                        phone = CASE WHEN temp_phone = '' THEN NULL ELSE temp_phone END
                    WHERE id = resolved_contact_id AND user_id = p_user_id;
                END IF;
            END IF;

            IF resolved_contact_id IS NULL AND temp_email IS NOT NULL AND temp_email <> '' THEN
                SELECT id INTO resolved_contact_id
                FROM public.contacts
                WHERE lower(email) = lower(temp_email) AND user_id = p_user_id
                LIMIT 1;

                IF resolved_contact_id IS NOT NULL THEN
                    UPDATE public.contacts
                    SET
                        name = TRIM(contact_input.name),
                        linkedin_url = CASE WHEN temp_linkedin = '' THEN NULL ELSE temp_linkedin END,
                        phone = CASE WHEN temp_phone = '' THEN NULL ELSE temp_phone END
                    WHERE id = resolved_contact_id AND user_id = p_user_id;
                END IF;
            END IF;

            IF resolved_contact_id IS NULL THEN
                IF contact_input.name IS NOT NULL AND TRIM(contact_input.name) <> '' THEN
                    INSERT INTO public.contacts (
                        user_id, name, email, linkedin_url, phone,
                        company_id, company_name_cache, is_favorite
                    )
                    VALUES (
                        p_user_id,
                        TRIM(contact_input.name),
                        CASE WHEN temp_email = '' THEN NULL ELSE temp_email END,
                        CASE WHEN temp_linkedin = '' THEN NULL ELSE temp_linkedin END,
                        CASE WHEN temp_phone = '' THEN NULL ELSE temp_phone END,
                        resolved_company_id, 
                        final_company_name_cache,
                        false
                    )
                    RETURNING id INTO resolved_contact_id;
                END IF;
            END IF;

            IF resolved_contact_id IS NOT NULL THEN
                INSERT INTO public.job_opening_contacts (user_id, job_opening_id, contact_id)
                VALUES (p_user_id, p_job_opening_id, resolved_contact_id);
            END IF;
        END LOOP;
    END IF;

    -- 4. Manage Follow-ups
    DELETE FROM public.follow_ups
    WHERE job_opening_id = p_job_opening_id AND user_id = p_user_id;

    IF p_follow_up_inputs IS NOT NULL AND jsonb_array_length(p_follow_up_inputs) > 0 THEN
        FOR follow_up_input IN SELECT * FROM jsonb_to_recordset(p_follow_up_inputs) AS x(subject TEXT, body TEXT, due_days_offset INT)
        LOOP
            IF follow_up_input.due_days_offset IS NULL THEN
                CONTINUE;
            END IF;
            original_follow_up_due_date := p_initial_email_date::timestamptz + (follow_up_input.due_days_offset || ' days')::INTERVAL;
            follow_up_due_date := original_follow_up_due_date;

            INSERT INTO public.follow_ups (user_id, job_opening_id, follow_up_date, original_due_date, email_subject, email_body, status)
            VALUES (p_user_id, p_job_opening_id, follow_up_due_date, original_follow_up_due_date, follow_up_input.subject, follow_up_input.body, 'Pending');
        END LOOP;
    END IF;

    RETURN p_job_opening_id;

EXCEPTION
    WHEN others THEN
        RAISE WARNING 'An error occurred in update_new_job_opening: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RETURN NULL;
END;
$$;
