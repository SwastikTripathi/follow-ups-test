-- A function to update the company_name_cache in contacts and job_openings when a company is updated.
-- This function is called by the trigger below.
CREATE OR REPLACE FUNCTION public.update_company_name_cache()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        -- Update contacts table
        UPDATE public.contacts
        SET company_name_cache = NEW.name
        WHERE company_id = NEW.id AND user_id = NEW.user_id;

        -- Update job_openings table
        UPDATE public.job_openings
        SET company_name_cache = NEW.name
        WHERE company_id = NEW.id AND user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- A trigger that fires after a company row is updated.
DROP TRIGGER IF EXISTS on_company_update ON public.companies;
CREATE TRIGGER on_company_update
AFTER UPDATE OF name ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_company_name_cache();

-- Drop the old, problematic RPC functions if they exist to ensure a clean state.
-- It's safe to run these even if the functions don't exist.
DROP FUNCTION IF EXISTS public.create_or_update_company(uuid,text,text,text,text,boolean,uuid);
DROP FUNCTION IF EXISTS public.create_or_update_company(uuid,text,text,text,text,boolean);

-- Recreate the create_or_update_company function with the correct signature and logic.
CREATE OR REPLACE FUNCTION public.create_or_update_company(
    p_user_id uuid,
    p_name text,
    p_website text DEFAULT NULL,
    p_linkedin_url text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_is_favorite boolean DEFAULT FALSE,
    p_company_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_resulting_company_id uuid;
    v_existing_company_by_name_id uuid;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE WARNING 'User ID cannot be null';
        RETURN NULL;
    END IF;

    IF p_name IS NULL OR p_name = '' THEN
        RAISE WARNING 'Company name cannot be empty';
        RETURN NULL;
    END IF;

    IF p_company_id IS NOT NULL THEN
        -- This is an UPDATE operation
        UPDATE companies
        SET
            name = p_name,
            website = p_website,
            linkedin_url = p_linkedin_url,
            notes = p_notes,
            is_favorite = COALESCE(p_is_favorite, companies.is_favorite, FALSE)
        WHERE id = p_company_id AND user_id = p_user_id
        RETURNING id INTO v_resulting_company_id;
    ELSE
        -- This is a CREATE or UPSERT-by-name operation
        SELECT id INTO v_existing_company_by_name_id
        FROM companies
        WHERE name = p_name AND user_id = p_user_id;

        IF v_existing_company_by_name_id IS NOT NULL THEN
            -- Company with same name exists, so we update it (upsert)
            UPDATE companies
            SET
                website = COALESCE(p_website, companies.website),
                linkedin_url = COALESCE(p_linkedin_url, companies.linkedin_url),
                notes = COALESCE(p_notes, companies.notes),
                is_favorite = COALESCE(p_is_favorite, companies.is_favorite, FALSE)
            WHERE id = v_existing_company_by_name_id AND user_id = p_user_id
            RETURNING id INTO v_resulting_company_id;
        ELSE
            -- No company with that name exists, so we create it
            INSERT INTO companies (user_id, name, website, linkedin_url, notes, is_favorite)
            VALUES (p_user_id, p_name, p_website, p_linkedin_url, p_notes, p_is_favorite)
            RETURNING id INTO v_resulting_company_id;
        END IF;
    END IF;

    RETURN v_resulting_company_id;
END;
$$;
