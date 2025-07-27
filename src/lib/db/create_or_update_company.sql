
CREATE OR REPLACE FUNCTION public.create_or_update_company(
    p_user_id uuid,
    p_name text,
    p_website text DEFAULT NULL,
    p_linkedin_url text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_is_favorite boolean DEFAULT false,
    p_company_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_resulting_company_id uuid;
    v_existing_company_by_name_id uuid;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE WARNING 'User ID cannot be null';
        RETURN NULL;
    END IF;

    IF p_name IS NULL OR TRIM(p_name) = '' THEN
        RAISE WARNING 'Company name cannot be empty';
        RETURN NULL;
    END IF;

    IF p_company_id IS NOT NULL THEN
        -- Update existing company by ID
        UPDATE public.companies
        SET
            name = TRIM(p_name),
            website = p_website,
            linkedin_url = p_linkedin_url,
            notes = p_notes,
            is_favorite = COALESCE(p_is_favorite, companies.is_favorite, FALSE)
        WHERE id = p_company_id AND user_id = p_user_id
        RETURNING id INTO v_resulting_company_id;
    ELSE
        -- No ID provided, check for existing company by name or create new
        SELECT id INTO v_existing_company_by_name_id
        FROM public.companies
        WHERE lower(name) = lower(TRIM(p_name)) AND user_id = p_user_id;

        IF v_existing_company_by_name_id IS NOT NULL THEN
            -- Update existing company found by name
            UPDATE public.companies
            SET
                website = COALESCE(p_website, companies.website),
                linkedin_url = COALESCE(p_linkedin_url, companies.linkedin_url),
                notes = COALESCE(p_notes, companies.notes),
                is_favorite = COALESCE(p_is_favorite, companies.is_favorite, FALSE)
            WHERE id = v_existing_company_by_name_id AND user_id = p_user_id
            RETURNING id INTO v_resulting_company_id;
        ELSE
            -- Create new company
            INSERT INTO public.companies (user_id, name, website, linkedin_url, notes, is_favorite)
            VALUES (p_user_id, TRIM(p_name), p_website, p_linkedin_url, p_notes, COALESCE(p_is_favorite, false))
            RETURNING id INTO v_resulting_company_id;
        END IF;
    END IF;

    RETURN v_resulting_company_id;
END;
$$;
