-- Drop dependent triggers first
DROP TRIGGER IF EXISTS on_public_job_openings_updated ON public.job_openings;
DROP TRIGGER IF EXISTS on_public_posts_updated ON public.posts;
DROP TRIGGER IF EXISTS on_public_user_subscriptions_updated ON public.user_subscriptions;
DROP TRIGGER IF EXISTS set_follow_up_user_id_trigger ON public.follow_ups;

-- Drop the function now that no triggers depend on it
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.set_follow_up_user_id();

-- Recreate the function to update company and synchronize caches
CREATE OR REPLACE FUNCTION public.create_or_update_company(
    p_user_id uuid,
    p_name text,
    p_company_id uuid DEFAULT NULL,
    p_website text DEFAULT NULL,
    p_linkedin_url text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_is_favorite boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_resulting_company_id uuid;
    v_existing_company_by_name_id uuid;
    v_original_name text;
BEGIN
    IF p_user_id IS NULL OR p_name IS NULL OR TRIM(p_name) = '' THEN
        RETURN NULL;
    END IF;

    IF p_company_id IS NOT NULL THEN
        -- Get the original name before updating
        SELECT name INTO v_original_name FROM public.companies WHERE id = p_company_id AND user_id = p_user_id;

        UPDATE public.companies
        SET
            name = TRIM(p_name),
            website = p_website,
            linkedin_url = p_linkedin_url,
            notes = p_notes,
            is_favorite = COALESCE(p_is_favorite, companies.is_favorite, FALSE)
        WHERE id = p_company_id AND user_id = p_user_id
        RETURNING id INTO v_resulting_company_id;
        
        -- If the name changed, update caches
        IF v_resulting_company_id IS NOT NULL AND TRIM(p_name) IS DISTINCT FROM v_original_name THEN
            UPDATE public.contacts
            SET company_name_cache = TRIM(p_name)
            WHERE company_id = v_resulting_company_id AND user_id = p_user_id;

            UPDATE public.job_openings
            SET company_name_cache = TRIM(p_name)
            WHERE company_id = v_resulting_company_id AND user_id = p_user_id;
        END IF;

    ELSE
        -- No ID provided, check for existing company by name or create new
        SELECT id INTO v_existing_company_by_name_id
        FROM public.companies
        WHERE lower(name) = lower(TRIM(p_name)) AND user_id = p_user_id;

        IF v_existing_company_by_name_id IS NOT NULL THEN
            UPDATE public.companies
            SET
                website = COALESCE(p_website, companies.website),
                linkedin_url = COALESCE(p_linkedin_url, companies.linkedin_url),
                notes = COALESCE(p_notes, companies.notes),
                is_favorite = COALESCE(p_is_favorite, companies.is_favorite, FALSE)
            WHERE id = v_existing_company_by_name_id AND user_id = p_user_id
            RETURNING id INTO v_resulting_company_id;
        ELSE
            INSERT INTO public.companies (user_id, name, website, linkedin_url, notes, is_favorite)
            VALUES (p_user_id, TRIM(p_name), p_website, p_linkedin_url, p_notes, COALESCE(p_is_favorite, false))
            RETURNING id INTO v_resulting_company_id;
        END IF;
    END IF;

    RETURN v_resulting_company_id;
END;
$$;

-- Recreate the function to update job openings with manual timestamp update
CREATE OR REPLACE FUNCTION public.update_new_job_opening(
    p_user_id uuid,
    p_job_opening_id uuid,
    p_company_id uuid,
    p_company_name text,
    p_role_title text,
    p_initial_email_date timestamp with time zone,
    p_status text,
    p_job_description_url text,
    p_notes text,
    p_is_favorite boolean,
    p_contact_inputs jsonb,
    p_follow_up_inputs jsonb
)
RETURNS uuid
LANGUAGE plpgsql
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

    SELECT jo.is_favorite INTO current_is_favorite
    FROM public.job_openings jo
    WHERE jo.id = p_job_opening_id AND jo.user_id = p_user_id;

    -- Update the job opening itself
    -- Note: job_openings table does NOT have an updated_at column
    UPDATE public.job_openings
    SET
        company_id = resolved_company_id,
        company_name_cache = final_company_name_cache,
        role_title = p_role_title,
        initial_email_date = p_initial_email_date,
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

    DELETE FROM public.follow_ups
    WHERE job_opening_id = p_job_opening_id AND user_id = p_user_id;

    IF p_follow_up_inputs IS NOT NULL AND jsonb_array_length(p_follow_up_inputs) > 0 THEN
        FOR follow_up_input IN SELECT * FROM jsonb_to_recordset(p_follow_up_inputs) AS x(subject TEXT, body TEXT, due_days_offset INT)
        LOOP
            IF follow_up_input.due_days_offset IS NULL THEN
                CONTINUE;
            END IF;
            original_follow_up_due_date := p_initial_email_date + (follow_up_input.due_days_offset || ' days')::INTERVAL;
            follow_up_due_date := original_follow_up_due_date;

            INSERT INTO public.follow_ups (user_id, job_opening_id, follow_up_date, original_due_date, email_subject, email_body, status)
            VALUES (p_user_id, p_job_opening_id, follow_up_due_date, original_follow_up_due_date, follow_up_input.subject, follow_up_input.body, 'Pending');
        END LOOP;
    END IF;

    RETURN p_job_opening_id;

EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
