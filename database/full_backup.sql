--
-- PostgreSQL database dump
--

\restrict h5eYxzPZsdgEwUbqowC7vKlvDRiCzVCY9OX2a55rLYIg2I0RoWFD6IkJBgTSxWz

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_ban_user(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_ban_user(target_user_id uuid, ban_status boolean, ban_reason text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Update user status
    UPDATE profiles
    SET 
        is_banned = ban_status,
        banned_reason = CASE WHEN ban_status THEN ban_reason ELSE NULL END,
        banned_at = CASE WHEN ban_status THEN NOW() ELSE NULL END,
        banned_by = CASE WHEN ban_status THEN auth.uid() ELSE NULL END
    WHERE id = target_user_id;

    -- Log action
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason)
    VALUES (
        auth.uid(),
        CASE WHEN ban_status THEN 'ban_user' ELSE 'unban_user' END,
        'user',
        target_user_id,
        ban_reason
    );

    RETURN TRUE;
END;
$$;


--
-- Name: admin_change_user_role(uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_change_user_role(target_user_id uuid, new_role text, make_admin boolean DEFAULT false) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Update user role
    UPDATE profiles
    SET 
        role = new_role,
        is_admin = make_admin
    WHERE id = target_user_id;

    -- Log action
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, metadata)
    VALUES (
        auth.uid(),
        'change_role',
        'user',
        target_user_id,
        json_build_object('new_role', new_role, 'is_admin', make_admin)
    );

    RETURN TRUE;
END;
$$;


--
-- Name: admin_delete_content(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_content(content_type_param text, content_id_param uuid, delete_reason text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Log action before deletion
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason)
    VALUES (
        auth.uid(),
        'delete_' || content_type_param,
        content_type_param,
        content_id_param,
        delete_reason
    );

    -- Delete content
    IF content_type_param = 'post' THEN
        DELETE FROM posts WHERE id = content_id_param;
    ELSIF content_type_param = 'product' THEN
        DELETE FROM products WHERE id = content_id_param;
    ELSIF content_type_param = 'project' THEN
        DELETE FROM investment_projects WHERE id = content_id_param;
    ELSIF content_type_param = 'comment' THEN
        DELETE FROM post_comments WHERE id = content_id_param;
    END IF;

    RETURN TRUE;
END;
$$;


--
-- Name: admin_moderate_content(text, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_moderate_content(content_type_param text, content_id_param uuid, new_status text, note text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    IF content_type_param = 'post' THEN
        UPDATE posts
        SET 
            moderation_status = new_status,
            moderation_note = note,
            moderated_by = auth.uid(),
            moderated_at = NOW()
        WHERE id = content_id_param;
    ELSIF content_type_param = 'product' THEN
        UPDATE products
        SET 
            moderation_status = new_status,
            moderation_note = note,
            moderated_by = auth.uid(),
            moderated_at = NOW()
        WHERE id = content_id_param;
    ELSIF content_type_param = 'project' THEN
        UPDATE investment_projects
        SET 
            moderation_status = new_status,
            moderation_note = note,
            moderated_by = auth.uid(),
            moderated_at = NOW()
        WHERE id = content_id_param;
    END IF;

    -- Log action
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason, metadata)
    VALUES (
        auth.uid(),
        CASE 
            WHEN new_status = 'approved' THEN 'approve_' || content_type_param
            WHEN new_status = 'rejected' THEN 'reject_' || content_type_param
            ELSE 'moderate_' || content_type_param
        END,
        content_type_param,
        content_id_param,
        note,
        json_build_object('new_status', new_status)
    );

    RETURN TRUE;
END;
$$;


--
-- Name: calculate_days_overdue(timestamp with time zone, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_days_overdue(p_due_date timestamp with time zone, p_outstanding_amount numeric) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  IF p_due_date < NOW() AND p_outstanding_amount > 0 THEN
    RETURN EXTRACT(DAY FROM NOW() - p_due_date)::INTEGER;
  ELSE
    RETURN 0;
  END IF;
END;
$$;


--
-- Name: calculate_user_points(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_user_points(user_uuid uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    total_points INTEGER := 0;
    post_points INTEGER := 0;
    like_points INTEGER := 0;
    view_points INTEGER := 0;
BEGIN
    -- Base points from profile
    SELECT COALESCE(points, 0) INTO total_points
    FROM public.profiles
    WHERE id = user_uuid;
    
    -- Points from posts (+10 per post)
    SELECT COUNT(*) * 10 INTO post_points
    FROM public.posts
    WHERE user_id = user_uuid;
    
    -- Points from likes (+5 per 10 likes)
    SELECT (COUNT(*) / 10) * 5 INTO like_points
    FROM public.post_likes pl
    JOIN public.posts p ON pl.post_id = p.id
    WHERE p.user_id = user_uuid;
    
    -- Points from views (+2 per 100 views)
    SELECT (COALESCE(SUM(views_count), 0) / 100) * 2 INTO view_points
    FROM public.posts
    WHERE user_id = user_uuid;
    
    RETURN total_points + post_points + like_points + view_points;
END;
$$;


--
-- Name: check_active_member_badge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_active_member_badge() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    consecutive_days INTEGER;
BEGIN
    -- Get consecutive posting days
    consecutive_days := get_consecutive_posting_days(NEW.user_id);

    -- Award badge if threshold reached
    IF consecutive_days >= 30 THEN
        PERFORM check_and_award_badge(NEW.user_id, 'active_member');
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: check_and_award_badge(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_award_badge(p_user_id uuid, p_badge_id text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user already has this badge
    IF EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_id = p_user_id AND badge_id = p_badge_id
    ) THEN
        RETURN FALSE;
    END IF;

    -- Award the badge
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, p_badge_id);

    RETURN TRUE;
END;
$$;


--
-- Name: check_credit_availability(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_credit_availability(p_customer_id uuid, p_business_id uuid, p_amount numeric) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  credit_info RECORD;
  result JSONB;
BEGIN
  SELECT 
    credit_limit,
    used_credit,
    available_credit,
    is_active,
    default_term_days,
    default_interest_rate
  INTO credit_info
  FROM credit_limits
  WHERE customer_id = p_customer_id
    AND business_id = p_business_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    result := jsonb_build_object(
      'available', false,
      'reason', 'No credit limit found',
      'credit_limit', 0,
      'available_credit', 0
    );
  ELSIF credit_info.available_credit < p_amount THEN
    result := jsonb_build_object(
      'available', false,
      'reason', 'Insufficient credit limit',
      'credit_limit', credit_info.credit_limit,
      'available_credit', credit_info.available_credit,
      'required', p_amount
    );
  ELSE
    result := jsonb_build_object(
      'available', true,
      'credit_limit', credit_info.credit_limit,
      'available_credit', credit_info.available_credit,
      'term_days', credit_info.default_term_days,
      'interest_rate', credit_info.default_interest_rate
    );
  END IF;
  
  RETURN result;
END;
$$;


--
-- Name: check_expert_badge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_expert_badge() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_rank INTEGER;
    calculated_points INTEGER;
BEGIN
    -- Calculate user's actual points (dynamic calculation)
    calculated_points := calculate_user_points(NEW.id);
    
    -- Only check if user has meaningful points (at least 100 points)
    IF calculated_points >= 100 THEN
        -- Get user's leaderboard rank (using dynamic points now)
        user_rank := get_user_leaderboard_rank(NEW.id);

        -- Award badge if in top 10 AND has at least 100 points
        IF user_rank IS NOT NULL AND user_rank <= 10 THEN
            PERFORM check_and_award_badge(NEW.id, 'expert');
        END IF;
    ELSE
        -- Remove expert badge if user no longer qualifies
        DELETE FROM user_badges
        WHERE user_id = NEW.id AND badge_id = 'expert';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: check_first_post_badge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_first_post_badge() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if this is the user's first post
    IF (SELECT COUNT(*) FROM posts WHERE user_id = NEW.user_id) = 1 THEN
        PERFORM check_and_award_badge(NEW.user_id, 'first_post');
    END IF;

    -- Log posting activity for consecutive days tracking
    INSERT INTO user_post_activity (user_id, post_date)
    VALUES (NEW.user_id, CURRENT_DATE)
    ON CONFLICT (user_id, post_date) DO NOTHING;

    RETURN NEW;
END;
$$;


--
-- Name: check_helpful_contributor_badge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_helpful_contributor_badge() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    total_likes INTEGER;
    post_author_id UUID;
BEGIN
    -- Get the author of the post that was liked
    SELECT user_id INTO post_author_id
    FROM posts
    WHERE id = NEW.post_id;

    -- Calculate total likes for all author's posts
    SELECT COUNT(*)::INTEGER INTO total_likes
    FROM post_likes pl
    JOIN posts p ON pl.post_id = p.id
    WHERE p.user_id = post_author_id;

    -- Award badge if threshold reached
    IF total_likes >= 100 THEN
        PERFORM check_and_award_badge(post_author_id, 'helpful_contributor');
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: check_investor_badge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_investor_badge() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    investment_count INTEGER;
BEGIN
    -- Count distinct projects user has invested in
    SELECT COUNT(DISTINCT project_id) INTO investment_count
    FROM project_investments
    WHERE investor_id = NEW.investor_id;

    -- Award badge if threshold reached
    IF investment_count >= 5 THEN
        PERFORM check_and_award_badge(NEW.investor_id, 'investor');
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: cleanup_expired_reset_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_reset_codes() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM password_reset_codes
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$;


--
-- Name: create_notification(uuid, text, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_notification_id UUID;
    v_actor_username TEXT;
    v_actor_avatar TEXT;
BEGIN
    -- Don't create notification if user is the actor (no self-notifications)
    IF p_user_id = p_actor_id THEN
        RETURN NULL;
    END IF;

    -- Get actor info if actor_id provided
    IF p_actor_id IS NOT NULL THEN
        SELECT username, avatar_url
        INTO v_actor_username, v_actor_avatar
        FROM profiles
        WHERE id = p_actor_id;
    END IF;

    -- Insert notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        actor_id,
        actor_username,
        actor_avatar
    )
    VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_link,
        p_actor_id,
        v_actor_username,
        v_actor_avatar
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;


--
-- Name: create_receivable_for_credit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_receivable_for_credit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.type = 'credit' AND NEW.status = 'completed' THEN
    INSERT INTO receivables (
      transaction_id,
      invoice_number,
      business_id,
      customer_id,
      original_amount,
      outstanding_amount,
      due_date,
      status
    ) VALUES (
      NEW.id,
      generate_invoice_number(),
      NEW.seller_id,
      NEW.buyer_id,
      NEW.final_amount,
      NEW.final_amount,
      NEW.due_date,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: export_user_data(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_user_data(user_uuid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'profile', (
      SELECT row_to_json(p.*)
      FROM profiles p
      WHERE p.id = user_uuid
    ),
    'settings', (
      SELECT row_to_json(s.*)
      FROM user_settings s
      WHERE s.user_id = user_uuid
    ),
    'posts', (
      SELECT jsonb_agg(row_to_json(p.*))
      FROM posts p
      WHERE p.user_id = user_uuid
    ),
    'comments', (
      SELECT jsonb_agg(row_to_json(c.*))
      FROM post_comments c
      WHERE c.user_id = user_uuid
    ),
    'products', (
      SELECT jsonb_agg(row_to_json(pr.*))
      FROM products pr
      WHERE pr.user_id = user_uuid
    ),
    'followers', (
      SELECT jsonb_agg(row_to_json(f.*))
      FROM user_follows f
      WHERE f.follower_id = user_uuid OR f.following_id = user_uuid
    ),
    'export_date', NOW()
  ) INTO user_data;
  
  RETURN user_data;
END;
$$;


--
-- Name: FUNCTION export_user_data(user_uuid uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.export_user_data(user_uuid uuid) IS 'Export all user data for GDPR compliance';


--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  invoice_num TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    invoice_num := 'INV' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM receivables WHERE invoice_number = invoice_num) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN invoice_num;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: generate_transaction_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_transaction_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM payment_transactions WHERE transaction_code = code) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: get_admin_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    stats JSON;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'active_users', (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '30 days'),
        'banned_users', (SELECT COUNT(*) FROM profiles WHERE is_banned = TRUE),
        'total_posts', (SELECT COUNT(*) FROM posts),
        'pending_posts', (SELECT COUNT(*) FROM posts WHERE moderation_status = 'pending'),
        'total_products', (SELECT COUNT(*) FROM products),
        'pending_products', (SELECT COUNT(*) FROM products WHERE moderation_status = 'pending'),
        'total_projects', (SELECT COUNT(*) FROM investment_projects),
        'pending_projects', (SELECT COUNT(*) FROM investment_projects WHERE moderation_status = 'pending'),
        'total_reports', (SELECT COUNT(*) FROM content_reports),
        'pending_reports', (SELECT COUNT(*) FROM content_reports WHERE status = 'pending'),
        'total_investments', (SELECT COALESCE(SUM(amount), 0) FROM project_investments),
        'total_comments', (SELECT COUNT(*) FROM post_comments)
    ) INTO stats;

    RETURN stats;
END;
$$;


--
-- Name: get_applicable_pricing(uuid, uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_applicable_pricing(p_business_id uuid, p_customer_id uuid, p_product_id uuid, p_base_price numeric) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  pricing RECORD;
  final_price NUMERIC;
  discount NUMERIC := 0;
BEGIN
  -- Find most specific pricing rule (highest priority)
  SELECT *
  INTO pricing
  FROM pricing_rules
  WHERE business_id = p_business_id
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
    AND (
      (customer_id = p_customer_id AND product_id = p_product_id) OR
      (customer_id = p_customer_id AND product_id IS NULL) OR
      (customer_id IS NULL AND product_id = p_product_id) OR
      (customer_id IS NULL AND product_id IS NULL)
    )
  ORDER BY 
    CASE 
      WHEN customer_id IS NOT NULL AND product_id IS NOT NULL THEN 4
      WHEN customer_id IS NOT NULL THEN 3
      WHEN product_id IS NOT NULL THEN 2
      ELSE 1
    END DESC,
    priority DESC
  LIMIT 1;
  
  IF FOUND THEN
    IF pricing.special_price IS NOT NULL THEN
      final_price := pricing.special_price;
      discount := p_base_price - final_price;
    ELSE
      discount := COALESCE(pricing.fixed_discount, 0) + 
                  (p_base_price * COALESCE(pricing.discount_percentage, 0) / 100);
      final_price := p_base_price - discount;
    END IF;
    
    RETURN jsonb_build_object(
      'base_price', p_base_price,
      'discount', discount,
      'final_price', final_price,
      'discount_percentage', pricing.discount_percentage,
      'credit_term_days', pricing.credit_term_days,
      'interest_rate', pricing.interest_rate
    );
  ELSE
    RETURN jsonb_build_object(
      'base_price', p_base_price,
      'discount', 0,
      'final_price', p_base_price,
      'discount_percentage', 0
    );
  END IF;
END;
$$;


--
-- Name: get_comments_with_stats(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_comments_with_stats(p_post_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_parent_comment_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, post_id uuid, user_id uuid, content text, parent_comment_id uuid, reply_count integer, like_count integer, user_liked boolean, username text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.parent_comment_id,
        c.reply_count,
        c.like_count,
        CASE 
            WHEN p_user_id IS NOT NULL THEN EXISTS(
                SELECT 1 FROM public.comment_likes 
                WHERE comment_id = c.id AND user_id = p_user_id
            )
            ELSE FALSE
        END AS user_liked,
        p.username,
        c.created_at,
        c.updated_at
    FROM public.post_comments c
    LEFT JOIN public.profiles p ON c.user_id = p.id
    WHERE c.post_id = p_post_id
      AND (
          (p_parent_comment_id IS NULL AND c.parent_comment_id IS NULL) OR
          (c.parent_comment_id = p_parent_comment_id)
      )
    ORDER BY c.created_at ASC;
END;
$$;


--
-- Name: get_consecutive_posting_days(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_consecutive_posting_days(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    consecutive_count INTEGER := 0;
    current_date_check DATE := CURRENT_DATE;
    found_gap BOOLEAN := FALSE;
BEGIN
    -- Check backwards from today
    WHILE NOT found_gap LOOP
        IF EXISTS (
            SELECT 1 FROM user_post_activity
            WHERE user_id = p_user_id 
            AND post_date = current_date_check
        ) THEN
            consecutive_count := consecutive_count + 1;
            current_date_check := current_date_check - INTERVAL '1 day';
        ELSE
            found_gap := TRUE;
        END IF;

        -- Safety limit
        IF consecutive_count >= 365 THEN
            found_gap := TRUE;
        END IF;
    END LOOP;

    RETURN consecutive_count;
END;
$$;


--
-- Name: get_content_for_moderation(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_content_for_moderation(content_type_filter text, status_filter text DEFAULT 'pending'::text, limit_count integer DEFAULT 20) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    IF content_type_filter = 'posts' THEN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                p.*,
                pr.username as author_name,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
            FROM posts p
            JOIN profiles pr ON p.user_id = pr.id
            WHERE p.moderation_status = status_filter
            ORDER BY p.created_at DESC
            LIMIT limit_count
        ) t;
    ELSIF content_type_filter = 'products' THEN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                p.*,
                pr.username as seller_name
            FROM products p
            JOIN profiles pr ON p.user_id = pr.id
            WHERE p.moderation_status = status_filter
            ORDER BY p.created_at DESC
            LIMIT limit_count
        ) t;
    ELSIF content_type_filter = 'projects' THEN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                ip.*,
                pr.username as creator_name,
                ip.current_funding,
                ip.funding_goal
            FROM investment_projects ip
            JOIN profiles pr ON ip.user_id = pr.id
            WHERE ip.moderation_status = status_filter
            ORDER BY ip.created_at DESC
            LIMIT limit_count
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;


--
-- Name: get_content_reports_admin(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_content_reports_admin(status_filter text DEFAULT NULL::text, limit_count integer DEFAULT 20) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            cr.*,
            pr.username as reporter_name,
            res.username as resolver_name
        FROM content_reports cr
        JOIN profiles pr ON cr.reporter_id = pr.id
        LEFT JOIN profiles res ON cr.resolved_by = res.id
        WHERE status_filter IS NULL OR cr.status = status_filter
        ORDER BY cr.created_at DESC
        LIMIT limit_count
    ) t;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;


--
-- Name: get_content_statistics_by_category(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_content_statistics_by_category() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    WITH post_stats AS (
        SELECT 
            category,
            COUNT(*) as total,
            AVG(views_count) as avg_views
        FROM posts
        WHERE moderation_status = 'approved'
        GROUP BY category
    ),
    product_stats AS (
        SELECT 
            category,
            COUNT(*) as total,
            AVG(price) as avg_price
        FROM products
        WHERE moderation_status = 'approved'
        GROUP BY category
    )
    SELECT json_build_object(
        'posts', (SELECT json_agg(row_to_json(post_stats)) FROM post_stats),
        'products', (SELECT json_agg(row_to_json(product_stats)) FROM product_stats)
    ) INTO result;
    
    RETURN result;
END;
$$;


--
-- Name: get_date_range_stats(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_date_range_stats(start_date timestamp with time zone, end_date timestamp with time zone) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'new_users', (
            SELECT COUNT(*) FROM profiles 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'new_posts', (
            SELECT COUNT(*) FROM posts 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'new_products', (
            SELECT COUNT(*) FROM products 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'new_projects', (
            SELECT COUNT(*) FROM investment_projects 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'new_investments', (
            SELECT COUNT(*) FROM project_investments 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'investment_amount', (
            SELECT COALESCE(SUM(amount), 0) FROM project_investments 
            WHERE created_at BETWEEN start_date AND end_date
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$;


--
-- Name: get_following_feed(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_following_feed(user_uuid uuid, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0) RETURNS TABLE(id uuid, user_id uuid, title text, content text, category text, image_url text, product_link text, views_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, moderation_status text, likes_count integer, comments_count integer, shares_count integer, author_username text, author_avatar text, author_points integer, is_liked boolean, is_shared boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.category,
    p.image_url,
    p.product_link,
    p.views_count,
    p.created_at,
    p.updated_at,
    p.moderation_status,
    COALESCE((SELECT COUNT(*)::INTEGER FROM post_likes WHERE post_id = p.id), 0) as likes_count,
    COALESCE((SELECT COUNT(*)::INTEGER FROM post_comments WHERE post_id = p.id), 0) as comments_count,
    COALESCE((SELECT COUNT(*)::INTEGER FROM post_shares WHERE post_id = p.id), 0) as shares_count,
    pr.username as author_username,
    pr.avatar_url as author_avatar,
    0 as author_points,
    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = user_uuid) as is_liked,
    EXISTS(SELECT 1 FROM post_shares ps WHERE ps.post_id = p.id AND ps.user_id = user_uuid) as is_shared
  FROM posts p
  JOIN profiles pr ON p.user_id = pr.id
  WHERE p.user_id IN (
    SELECT following_id
    FROM user_follows
    WHERE follower_id = user_uuid
  )
  AND (p.moderation_status IS NULL OR p.moderation_status = 'approved')
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


--
-- Name: FUNCTION get_following_feed(user_uuid uuid, limit_count integer, offset_count integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_following_feed(user_uuid uuid, limit_count integer, offset_count integer) IS 'Get posts from followed users';


--
-- Name: get_investment_projects_with_stats(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_investment_projects_with_stats(status_filter text DEFAULT NULL::text, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0) RETURNS TABLE(id uuid, user_id uuid, title text, description text, funding_goal bigint, current_funding bigint, farmers_impacted integer, area text, status text, image_url text, start_date timestamp with time zone, end_date timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, creator_username text, investors_count bigint, progress_percentage numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.funding_goal,
        p.current_funding,
        p.farmers_impacted,
        p.area,
        p.status,
        p.image_url,
        p.start_date,
        p.end_date,
        p.created_at,
        p.updated_at,
        pr.username AS creator_username,
        COUNT(DISTINCT i.id) AS investors_count,
        ROUND((p.current_funding::NUMERIC / p.funding_goal::NUMERIC * 100), 2) AS progress_percentage
    FROM public.investment_projects p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    LEFT JOIN public.project_investments i ON p.id = i.project_id AND i.status = 'confirmed'
    WHERE (status_filter IS NULL OR p.status = status_filter)
    GROUP BY p.id, pr.username
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;


--
-- Name: get_investment_trends(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_investment_trends(days_back integer DEFAULT 30) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    WITH date_series AS (
        SELECT generate_series(
            NOW() - (days_back || ' days')::INTERVAL,
            NOW(),
            '1 day'::INTERVAL
        )::DATE as date
    ),
    daily_investments AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as count,
            SUM(amount) as total_amount
        FROM project_investments
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    )
    SELECT json_agg(
        json_build_object(
            'date', ds.date,
            'investments', COALESCE(di.count, 0),
            'amount', COALESCE(di.total_amount, 0)
        ) ORDER BY ds.date
    ) INTO result
    FROM date_series ds
    LEFT JOIN daily_investments di ON ds.date = di.date;
    
    RETURN result;
END;
$$;


--
-- Name: get_platform_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_platform_statistics() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'active_users_today', (
            SELECT COUNT(DISTINCT user_id) FROM (
                SELECT user_id FROM posts WHERE DATE(created_at) = CURRENT_DATE
                UNION
                SELECT user_id FROM post_comments WHERE DATE(created_at) = CURRENT_DATE
                UNION
                SELECT user_id FROM post_likes WHERE DATE(created_at) = CURRENT_DATE
            ) t
        ),
        'active_users_week', (
            SELECT COUNT(DISTINCT user_id) FROM (
                SELECT user_id FROM posts WHERE created_at >= NOW() - INTERVAL '7 days'
                UNION
                SELECT user_id FROM post_comments WHERE created_at >= NOW() - INTERVAL '7 days'
                UNION
                SELECT user_id FROM post_likes WHERE created_at >= NOW() - INTERVAL '7 days'
            ) t
        ),
        'active_users_month', (
            SELECT COUNT(DISTINCT user_id) FROM (
                SELECT user_id FROM posts WHERE created_at >= NOW() - INTERVAL '30 days'
                UNION
                SELECT user_id FROM post_comments WHERE created_at >= NOW() - INTERVAL '30 days'
                UNION
                SELECT user_id FROM post_likes WHERE created_at >= NOW() - INTERVAL '30 days'
            ) t
        ),
        'total_posts', (SELECT COUNT(*) FROM posts WHERE moderation_status = 'approved'),
        'total_products', (SELECT COUNT(*) FROM products WHERE moderation_status = 'approved'),
        'total_projects', (SELECT COUNT(*) FROM investment_projects WHERE moderation_status = 'approved'),
        'total_comments', (SELECT COUNT(*) FROM post_comments),
        'total_likes', (SELECT COUNT(*) FROM post_likes),
        'total_investments', (SELECT COUNT(*) FROM project_investments),
        'total_investment_amount', (SELECT COALESCE(SUM(amount), 0) FROM project_investments),
        'avg_engagement_rate', (
            SELECT ROUND(
                (COUNT(DISTINCT pl.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT p.user_id), 0) * 100), 
                2
            )
            FROM posts p
            LEFT JOIN post_likes pl ON p.id = pl.post_id
            WHERE p.created_at >= NOW() - INTERVAL '30 days'
        ),
        'user_growth_rate_month', (
            WITH current_month AS (
                SELECT COUNT(*) as count FROM profiles 
                WHERE created_at >= DATE_TRUNC('month', NOW())
            ),
            previous_month AS (
                SELECT COUNT(*) as count FROM profiles 
                WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                AND created_at < DATE_TRUNC('month', NOW())
            )
            SELECT ROUND(
                (current_month.count::NUMERIC / NULLIF(previous_month.count, 0) - 1) * 100,
                2
            )
            FROM current_month, previous_month
        ),
        'content_growth_rate_month', (
            WITH current_month AS (
                SELECT COUNT(*) as count FROM posts 
                WHERE created_at >= DATE_TRUNC('month', NOW())
            ),
            previous_month AS (
                SELECT COUNT(*) as count FROM posts 
                WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                AND created_at < DATE_TRUNC('month', NOW())
            )
            SELECT ROUND(
                (current_month.count::NUMERIC / NULLIF(previous_month.count, 0) - 1) * 100,
                2
            )
            FROM current_month, previous_month
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


--
-- Name: get_post_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_post_by_id(post_uuid uuid) RETURNS TABLE(id uuid, user_id uuid, title text, content text, category text, image_url text, product_link text, views_count integer, likes_count bigint, comments_count bigint, created_at timestamp with time zone, updated_at timestamp with time zone, author_username text, author_avatar text, author_points integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        pr.points AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.id = post_uuid
    GROUP BY p.id, pr.username, pr.avatar_url, pr.points;
END;
$$;


--
-- Name: get_post_with_media(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_post_with_media(p_post_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'post', row_to_json(p.*),
        'images', COALESCE(
            (SELECT json_agg(row_to_json(pi.*) ORDER BY pi.display_order)
             FROM post_images pi WHERE pi.post_id = p_post_id),
            '[]'::json
        ),
        'videos', COALESCE(
            (SELECT json_agg(row_to_json(pv.*))
             FROM post_videos pv WHERE pv.post_id = p_post_id),
            '[]'::json
        )
    )
    INTO result
    FROM posts p
    WHERE p.id = p_post_id;
    
    RETURN result;
END;
$$;


--
-- Name: get_post_with_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_post_with_stats(post_uuid uuid) RETURNS TABLE(id uuid, user_id uuid, title text, content text, category text, image_url text, product_link text, views_count integer, likes_count bigint, comments_count bigint, shares_count bigint, created_at timestamp with time zone, updated_at timestamp with time zone, author_username text, author_avatar text, author_points integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        COUNT(DISTINCT ps.id) AS shares_count,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        p.id = post_uuid
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL) -- Only show if approved
    GROUP BY p.id, pr.username, pr.avatar_url;
END;
$$;


--
-- Name: get_post_with_stats(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_post_with_stats(post_uuid uuid, current_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, user_id uuid, title text, content text, category text, image_url text, product_link text, views_count integer, likes_count bigint, comments_count bigint, shares_count bigint, created_at timestamp with time zone, updated_at timestamp with time zone, author_username text, author_avatar text, author_points integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        COUNT(DISTINCT ps.id) AS shares_count,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        p.id = post_uuid
        AND (
            p.moderation_status = 'approved' 
            OR p.moderation_status IS NULL
            OR p.user_id = current_user_id  -- User can view their own posts
        )
    GROUP BY p.id, pr.username, pr.avatar_url;
END;
$$;


--
-- Name: get_posts_with_stats(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_posts_with_stats(category_filter text DEFAULT NULL::text, search_query text DEFAULT NULL::text, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0) RETURNS TABLE(id uuid, user_id uuid, title text, content text, category text, image_url text, product_link text, views_count integer, likes_count bigint, comments_count bigint, created_at timestamp with time zone, updated_at timestamp with time zone, author_username text, author_avatar text, author_points integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        pr.points AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR 
             p.title ILIKE '%' || search_query || '%' OR 
             p.content ILIKE '%' || search_query || '%')
    GROUP BY p.id, pr.username, pr.avatar_url, pr.points
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;


--
-- Name: get_posts_with_stats(text, text, integer, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_posts_with_stats(category_filter text DEFAULT NULL::text, search_query text DEFAULT NULL::text, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0, current_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, user_id uuid, title text, content text, category text, image_url text, product_link text, views_count integer, likes_count bigint, comments_count bigint, shares_count bigint, is_liked boolean, is_shared boolean, created_at timestamp with time zone, updated_at timestamp with time zone, author_username text, author_avatar text, author_points integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        COUNT(DISTINCT ps.id) AS shares_count,
        EXISTS(SELECT 1 FROM public.post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = current_user_id) AS is_liked,
        EXISTS(SELECT 1 FROM public.post_shares ps2 WHERE ps2.post_id = p.id AND ps2.user_id = current_user_id) AS is_shared,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR p.title ILIKE '%' || search_query || '%' OR p.content ILIKE '%' || search_query || '%')
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL) -- Only show approved posts
    GROUP BY p.id, pr.username, pr.avatar_url
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;


--
-- Name: get_product_with_media(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_product_with_media(p_product_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'product', row_to_json(p.*),
        'images', COALESCE(
            (SELECT json_agg(row_to_json(pi.*) ORDER BY pi.display_order)
             FROM product_images pi WHERE pi.product_id = p_product_id),
            '[]'::json
        ),
        'videos', COALESCE(
            (SELECT json_agg(row_to_json(pv.*))
             FROM product_videos pv WHERE pv.product_id = p_product_id),
            '[]'::json
        )
    )
    INTO result
    FROM products p
    WHERE p.id = p_product_id;
    
    RETURN result;
END;
$$;


--
-- Name: get_product_with_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_product_with_stats(product_uuid uuid) RETURNS TABLE(id uuid, user_id uuid, name text, description text, price numeric, category text, image_url text, contact text, created_at timestamp with time zone, seller_username text, seller_avatar text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.image_url,
        p.contact,
        p.created_at,
        pr.username AS seller_username,
        pr.avatar_url AS seller_avatar
    FROM public.products p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        p.id = product_uuid
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL); -- Only approved
END;
$$;


--
-- Name: get_product_with_stats(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_product_with_stats(product_uuid uuid, current_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, user_id uuid, name text, description text, price numeric, category text, image_url text, contact text, views_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, seller_username text, seller_avatar text, seller_points integer, seller_role text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.image_url,
        p.contact,
        COALESCE(p.views_count, 0) AS views_count,
        p.created_at,
        p.updated_at,
        pr.username AS seller_username,
        pr.avatar_url AS seller_avatar,
        COALESCE(pr.points, 0) AS seller_points,
        pr.role AS seller_role
    FROM public.products p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.id = product_uuid
    AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL);
END;
$$;


--
-- Name: get_products_with_stats(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_products_with_stats(category_filter text DEFAULT NULL::text, search_query text DEFAULT NULL::text, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0) RETURNS TABLE(id uuid, user_id uuid, name text, description text, price numeric, category text, image_url text, contact text, views_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, seller_username text, seller_avatar text, seller_points integer, seller_role text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.image_url,
        p.contact,
        COALESCE(p.views_count, 0) AS views_count,
        p.created_at,
        p.updated_at,
        pr.username AS seller_username,
        pr.avatar_url AS seller_avatar,
        COALESCE(pr.points, 0) AS seller_points,
        pr.role AS seller_role
    FROM public.products p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR p.name ILIKE '%' || search_query || '%' OR p.description ILIKE '%' || search_query || '%')
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL)
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;


--
-- Name: get_project_analytics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_analytics(project_id_param uuid DEFAULT NULL::uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'project_id', ip.id,
            'title', ip.title,
            'creator_username', pr.username,
            'funding_goal', ip.funding_goal,
            'current_funding', ip.current_funding,
            'funding_percentage', ROUND((ip.current_funding::NUMERIC / NULLIF(ip.funding_goal, 0) * 100), 2),
            'total_investors', investor_counts.count,
            'avg_investment', ROUND(investor_counts.avg_amount, 2),
            'created_at', ip.created_at,
            'days_active', EXTRACT(DAY FROM NOW() - ip.created_at),
            'roi_estimate', ip.expected_return,
            'status', ip.moderation_status,
            'location', ip.location
        )
    ) INTO result
    FROM investment_projects ip
    LEFT JOIN profiles pr ON ip.user_id = pr.id
    LEFT JOIN (
        SELECT 
            project_id,
            COUNT(*) as count,
            AVG(amount) as avg_amount
        FROM project_investments
        GROUP BY project_id
    ) investor_counts ON ip.id = investor_counts.project_id
    WHERE (project_id_param IS NULL OR ip.id = project_id_param)
    AND ip.moderation_status = 'approved';
    
    RETURN COALESCE(result, '[]'::JSON);
END;
$$;


--
-- Name: get_project_categories_performance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_categories_performance() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'category', category,
            'total_projects', COUNT(*),
            'total_funding', SUM(current_funding),
            'avg_funding_percentage', ROUND(AVG(current_funding::NUMERIC / NULLIF(funding_goal, 0) * 100), 2),
            'successful_projects', COUNT(*) FILTER (WHERE current_funding >= funding_goal)
        )
    ) INTO result
    FROM investment_projects
    WHERE moderation_status = 'approved'
    GROUP BY category;
    
    RETURN COALESCE(result, '[]'::JSON);
END;
$$;


--
-- Name: get_project_follow_stats(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_follow_stats(proj_uuid uuid, current_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(followers_count integer, is_following boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM project_follows WHERE project_id = proj_uuid) AS followers_count,
    (SELECT EXISTS(SELECT 1 FROM project_follows WHERE user_id = current_user_id AND project_id = proj_uuid)) AS is_following;
END;
$$;


--
-- Name: FUNCTION get_project_follow_stats(proj_uuid uuid, current_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_project_follow_stats(proj_uuid uuid, current_user_id uuid) IS 'Get follow statistics for a project';


--
-- Name: get_project_leaderboard(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_leaderboard(p_limit integer DEFAULT 10) RETURNS TABLE(project_id uuid, title text, image_url text, avg_rating numeric, total_ratings bigint, rating_score numeric, funding_progress numeric, current_funding bigint, funding_goal bigint, creator_username text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.image_url,
        stats.avg_rating,
        stats.total_ratings,
        stats.rating_score,
        CASE 
            WHEN p.funding_goal > 0 THEN 
                LEAST(p.current_funding::NUMERIC / p.funding_goal::NUMERIC * 100, 100)
            ELSE 0
        END as funding_progress,
        p.current_funding,
        p.funding_goal,
        u.username
    FROM investment_projects p
    LEFT JOIN profiles u ON p.user_id = u.id
    CROSS JOIN LATERAL get_project_rating_stats(p.id) as stats
    WHERE p.status = 'active'
    ORDER BY stats.rating_score DESC, stats.total_ratings DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_project_rating_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_rating_stats(p_project_id uuid) RETURNS TABLE(avg_rating numeric, total_ratings bigint, rating_score numeric)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_avg_rating NUMERIC;
    v_total_ratings BIGINT;
    v_funding_progress NUMERIC;
    v_score NUMERIC;
BEGIN
    -- Get average rating and total count
    SELECT 
        COALESCE(AVG(rating), 0)::NUMERIC,
        COUNT(*)::BIGINT
    INTO v_avg_rating, v_total_ratings
    FROM project_ratings
    WHERE project_id = p_project_id;

    -- Get funding progress (0 to 1)
    SELECT 
        CASE 
            WHEN funding_goal > 0 THEN 
                LEAST(current_funding::NUMERIC / funding_goal::NUMERIC, 1.0)
            ELSE 0
        END
    INTO v_funding_progress
    FROM investment_projects
    WHERE id = p_project_id;

    -- Calculate score: (AvgStar * 0.6) + (log10(TotalRatings + 1) * 0.2) + (FundingProgress * 0.2)
    -- Note: PostgreSQL uses log() for base 10 logarithm
    v_score := (
        (v_avg_rating / 5.0 * 0.6) + 
        (LOG(v_total_ratings + 1) * 0.2) + 
        (v_funding_progress * 0.2)
    );

    RETURN QUERY SELECT v_avg_rating, v_total_ratings, v_score;
END;
$$;


--
-- Name: get_top_contributors(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_contributors(limit_count integer DEFAULT 10) RETURNS TABLE(user_id uuid, username text, total_points integer, posts_count bigint, likes_received bigint, rank bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            pr.id AS user_id,
            pr.username,
            calculate_user_points(pr.id) AS total_points,
            COUNT(DISTINCT p.id) AS posts_count,
            COUNT(DISTINCT pl.id) AS likes_received,
            ROW_NUMBER() OVER (ORDER BY calculate_user_points(pr.id) DESC, pr.username ASC) AS rank
        FROM public.profiles pr
        LEFT JOIN public.posts p ON pr.id = p.user_id
        LEFT JOIN public.post_likes pl ON p.id = pl.post_id
        GROUP BY pr.id, pr.username
    )
    SELECT 
        ranked_users.user_id,
        ranked_users.username,
        ranked_users.total_points,
        ranked_users.posts_count,
        ranked_users.likes_received,
        ranked_users.rank
    FROM ranked_users
    WHERE ranked_users.total_points > 0  -- Only include users with points
    ORDER BY ranked_users.rank, ranked_users.username  -- Order by rank, then alphabetically for ties
    LIMIT limit_count;  -- Return exactly N users, not all users with rank <= N
END;
$$;


--
-- Name: get_top_contributors_analytics(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_contributors_analytics(limit_count integer DEFAULT 10, period_days integer DEFAULT 30) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'user_id', p.id,
            'username', p.username,
            'avatar_url', p.avatar_url,
            'total_posts', post_counts.count,
            'total_comments', comment_counts.count,
            'total_likes_received', like_counts.count,
            'points', COALESCE(calculate_user_points(p.id), 0)
        )
    ) INTO result
    FROM profiles p
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count 
        FROM posts 
        WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
        GROUP BY user_id
    ) post_counts ON p.id = post_counts.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count 
        FROM post_comments 
        WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
        GROUP BY user_id
    ) comment_counts ON p.id = comment_counts.user_id
    LEFT JOIN (
        SELECT po.user_id, COUNT(*) as count 
        FROM post_likes pl
        JOIN posts po ON pl.post_id = po.id
        WHERE pl.created_at >= NOW() - (period_days || ' days')::INTERVAL
        GROUP BY po.user_id
    ) like_counts ON p.id = like_counts.user_id
    WHERE post_counts.count > 0 OR comment_counts.count > 0
    ORDER BY COALESCE(calculate_user_points(p.id), 0) DESC
    LIMIT limit_count;
    
    RETURN result;
END;
$$;


--
-- Name: get_unread_notifications_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_notifications_count(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false;

    RETURN v_count;
END;
$$;


--
-- Name: get_user_badge_progress(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_badge_progress(p_user_id uuid) RETURNS TABLE(badge_id text, badge_name text, badge_description text, badge_icon text, badge_color text, earned boolean, progress integer, rank bigint, target integer, earned_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bd.id,
        bd.name,
        bd.description,
        bd.icon,
        bd.color,
        ub.id IS NOT NULL as earned,
        CASE bd.criteria_type
            WHEN 'post_count' THEN (
                SELECT COUNT(*)::INTEGER FROM posts WHERE user_id = p_user_id
            )
            WHEN 'total_likes' THEN (
                SELECT COUNT(*)::INTEGER 
                FROM post_likes pl
                JOIN posts p ON pl.post_id = p.id
                WHERE p.user_id = p_user_id
            )
            WHEN 'consecutive_days' THEN (
                SELECT get_consecutive_posting_days(p_user_id)
            )
            WHEN 'investment_count' THEN (
                SELECT COUNT(DISTINCT project_id)::INTEGER FROM project_investments WHERE investor_id = p_user_id
            )
            ELSE 0
        END as progress,
        get_user_leaderboard_rank(p_user_id) as rank,
        bd.criteria_value as target,
        ub.earned_at
    FROM badge_definitions bd
    LEFT JOIN user_badges ub ON ub.badge_id = bd.id AND ub.user_id = p_user_id
    ORDER BY bd.display_order;
END;
$$;


--
-- Name: get_user_engagement_metrics(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_engagement_metrics(days_back integer DEFAULT 30) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    WITH date_series AS (
        SELECT generate_series(
            NOW() - (days_back || ' days')::INTERVAL,
            NOW(),
            '1 day'::INTERVAL
        )::DATE as date
    ),
    daily_active_users AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(DISTINCT user_id) as active_users
        FROM (
            SELECT user_id, created_at FROM posts
            UNION ALL
            SELECT user_id, created_at FROM products
            UNION ALL
            SELECT user_id, created_at FROM post_comments
            UNION ALL
            SELECT user_id, created_at FROM post_likes
        ) all_activity
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_posts AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM posts
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_comments AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM post_comments
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_likes AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM post_likes
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    )
    SELECT json_agg(
        json_build_object(
            'date', ds.date,
            'active_users', COALESCE(dau.active_users, 0),
            'posts', COALESCE(dp.count, 0),
            'comments', COALESCE(dc.count, 0),
            'likes', COALESCE(dl.count, 0)
        ) ORDER BY ds.date
    ) INTO result
    FROM date_series ds
    LEFT JOIN daily_active_users dau ON ds.date = dau.date
    LEFT JOIN daily_posts dp ON ds.date = dp.date
    LEFT JOIN daily_comments dc ON ds.date = dc.date
    LEFT JOIN daily_likes dl ON ds.date = dl.date;
    
    RETURN result;
END;
$$;


--
-- Name: get_user_follow_stats(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_follow_stats(user_uuid uuid, current_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(followers_count integer, following_count integer, is_following boolean, is_followed_by boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM user_follows WHERE following_id = user_uuid) AS followers_count,
    (SELECT COUNT(*)::INTEGER FROM user_follows WHERE follower_id = user_uuid) AS following_count,
    (SELECT EXISTS(SELECT 1 FROM user_follows WHERE follower_id = current_user_id AND following_id = user_uuid)) AS is_following,
    (SELECT EXISTS(SELECT 1 FROM user_follows WHERE follower_id = user_uuid AND following_id = current_user_id)) AS is_followed_by;
END;
$$;


--
-- Name: FUNCTION get_user_follow_stats(user_uuid uuid, current_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_follow_stats(user_uuid uuid, current_user_id uuid) IS 'Get follow statistics for a user';


--
-- Name: get_user_followers(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_followers(user_uuid uuid, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0) RETURNS TABLE(id uuid, follower_id uuid, following_id uuid, created_at timestamp with time zone, username text, avatar_url text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    uf.id,
    uf.follower_id,
    uf.following_id,
    uf.created_at,
    p.username,
    p.avatar_url
  FROM user_follows uf
  JOIN profiles p ON uf.follower_id = p.id
  WHERE uf.following_id = user_uuid
  ORDER BY uf.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


--
-- Name: get_user_following(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_following(user_uuid uuid, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0) RETURNS TABLE(id uuid, follower_id uuid, following_id uuid, created_at timestamp with time zone, username text, avatar_url text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    uf.id,
    uf.follower_id,
    uf.following_id,
    uf.created_at,
    p.username,
    p.avatar_url
  FROM user_follows uf
  JOIN profiles p ON uf.following_id = p.id
  WHERE uf.follower_id = user_uuid
  ORDER BY uf.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


--
-- Name: get_user_growth_metrics(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_growth_metrics(days_back integer DEFAULT 90) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    WITH date_series AS (
        SELECT generate_series(
            NOW() - (days_back || ' days')::INTERVAL,
            NOW(),
            '1 day'::INTERVAL
        )::DATE as date
    ),
    cumulative_users AS (
        SELECT 
            ds.date,
            COUNT(p.id) as total_users
        FROM date_series ds
        LEFT JOIN profiles p ON DATE(p.created_at) <= ds.date
        GROUP BY ds.date
    ),
    daily_new_users AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_users
        FROM profiles
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    )
    SELECT json_agg(
        json_build_object(
            'date', cu.date,
            'total_users', cu.total_users,
            'new_users', COALESCE(dnu.new_users, 0)
        ) ORDER BY cu.date
    ) INTO result
    FROM cumulative_users cu
    LEFT JOIN daily_new_users dnu ON cu.date = dnu.date;
    
    RETURN result;
END;
$$;


--
-- Name: get_user_leaderboard_rank(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_leaderboard_rank(p_user_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE 
    user_rank BIGINT;
BEGIN
    -- Calculate rank based on dynamic points using ROW_NUMBER
    -- ROW_NUMBER gives unique ranks: 1, 2, 3, 4 (no ties, sorted by username for same points)
    SELECT rank INTO user_rank
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY calculate_user_points(id) DESC, username ASC) as rank
        FROM profiles
        WHERE calculate_user_points(id) > 0  -- Only include users with actual points
    ) ranked
    WHERE id = p_user_id;

    -- If user has 0 points or doesn't exist, return 0
    RETURN COALESCE(user_rank, 0);
END;
$$;


--
-- Name: get_user_posts(uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_posts(user_uuid uuid, limit_count integer DEFAULT 20, current_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, user_id uuid, title text, content text, category text, image_url text, product_link text, views_count integer, likes_count bigint, comments_count bigint, shares_count bigint, is_liked boolean, is_shared boolean, created_at timestamp with time zone, updated_at timestamp with time zone, author_username text, author_avatar text, author_points integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        COUNT(DISTINCT ps.id) AS shares_count,
        EXISTS(SELECT 1 FROM public.post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = current_user_id) AS is_liked,
        EXISTS(SELECT 1 FROM public.post_shares ps2 WHERE ps2.post_id = p.id AND ps2.user_id = current_user_id) AS is_shared,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        p.user_id = user_uuid
        AND (
            p.user_id = current_user_id  -- User can see their own posts
            OR p.moderation_status = 'approved'  -- Others see only approved
            OR p.moderation_status IS NULL
        )
    GROUP BY p.id, pr.username, pr.avatar_url
    ORDER BY p.created_at DESC
    LIMIT limit_count;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    language text DEFAULT 'vi'::text,
    theme text DEFAULT 'light'::text,
    email_notifications boolean DEFAULT true,
    email_new_follower boolean DEFAULT true,
    email_post_like boolean DEFAULT true,
    email_post_comment boolean DEFAULT true,
    email_project_update boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    push_new_follower boolean DEFAULT true,
    push_post_like boolean DEFAULT false,
    push_post_comment boolean DEFAULT true,
    push_project_update boolean DEFAULT true,
    profile_visibility text DEFAULT 'public'::text,
    show_email boolean DEFAULT false,
    show_phone boolean DEFAULT true,
    allow_messages boolean DEFAULT true,
    show_activity boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_settings_language_check CHECK ((language = ANY (ARRAY['vi'::text, 'en'::text]))),
    CONSTRAINT user_settings_profile_visibility_check CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'followers'::text, 'private'::text]))),
    CONSTRAINT user_settings_theme_check CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])))
);


--
-- Name: TABLE user_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_settings IS 'User preferences, notification settings, and privacy options';


--
-- Name: get_user_settings(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_settings(user_uuid uuid) RETURNS public.user_settings
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  settings_record user_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings_record
  FROM user_settings
  WHERE user_id = user_uuid;
  
  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO user_settings (user_id)
    VALUES (user_uuid)
    RETURNING * INTO settings_record;
  END IF;
  
  RETURN settings_record;
END;
$$;


--
-- Name: FUNCTION get_user_settings(user_uuid uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_settings(user_uuid uuid) IS 'Get user settings, creates default if not exists';


--
-- Name: get_user_shared_posts(uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_shared_posts(user_uuid uuid, limit_count integer DEFAULT 20, current_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, user_id uuid, title text, content text, category text, image_url text, product_link text, views_count integer, likes_count bigint, comments_count bigint, shares_count bigint, is_liked boolean, is_shared boolean, created_at timestamp with time zone, updated_at timestamp with time zone, author_username text, author_avatar text, author_points integer, shared_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        COUNT(DISTINCT ps_all.id) AS shares_count,
        EXISTS(SELECT 1 FROM public.post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = current_user_id) AS is_liked,
        EXISTS(SELECT 1 FROM public.post_shares ps2 WHERE ps2.post_id = p.id AND ps2.user_id = current_user_id) AS is_shared,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points,
        ps.created_at AS shared_at
    FROM public.post_shares ps
    JOIN public.posts p ON ps.post_id = p.id
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps_all ON p.id = ps_all.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        ps.user_id = user_uuid
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL) -- Only approved posts
    GROUP BY p.id, pr.username, pr.avatar_url, ps.created_at
    ORDER BY ps.created_at DESC
    LIMIT limit_count;
END;
$$;


--
-- Name: get_users_admin(text, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_users_admin(search_query text DEFAULT NULL::text, role_filter text DEFAULT NULL::text, status_filter text DEFAULT NULL::text, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0) RETURNS TABLE(id uuid, username text, phone_number text, role text, is_admin boolean, is_banned boolean, banned_reason text, points integer, total_posts integer, total_products integer, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.phone_number,
        p.role,
        p.is_admin,
        p.is_banned,
        p.banned_reason,
        COALESCE(calculate_user_points(p.id), 0) as points,
        (SELECT COUNT(*)::INT FROM posts WHERE user_id = p.id) as total_posts,
        (SELECT COUNT(*)::INT FROM products WHERE user_id = p.id) as total_products,
        p.created_at
    FROM profiles p
    WHERE 
        (search_query IS NULL OR p.username ILIKE '%' || search_query || '%')
        AND (role_filter IS NULL OR p.role = role_filter)
        AND (status_filter IS NULL OR 
            (status_filter = 'banned' AND p.is_banned = TRUE) OR
            (status_filter = 'active' AND p.is_banned = FALSE)
        )
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Insert a new profile for the new user
  -- Username is extracted from email (everything before @)
  INSERT INTO public.profiles (id, username, phone_number, role)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1), -- Extract username from email
    NEW.raw_user_meta_data->>'phone_number', -- Get phone from metadata
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer') -- Default to farmer
  );
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: increment_post_views(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_post_views(post_uuid uuid, viewer_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Try to insert a view record (will fail if already viewed by this user)
    INSERT INTO public.post_views (post_id, user_id)
    VALUES (post_uuid, viewer_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    
    -- Update the denormalized view count
    UPDATE public.posts
    SET views_count = (SELECT COUNT(*) FROM public.post_views WHERE post_id = post_uuid)
    WHERE id = post_uuid;
END;
$$;


--
-- Name: increment_product_views(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_product_views(product_uuid uuid, viewer_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.product_views (product_id, user_id)
    VALUES (product_uuid, viewer_id)
    ON CONFLICT (product_id, user_id) DO NOTHING;
    
    UPDATE public.products
    SET views_count = (SELECT COUNT(*) FROM public.product_views WHERE product_id = product_uuid)
    WHERE id = product_uuid;
END;
$$;


--
-- Name: is_username_available(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_username_available(check_username text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = check_username
  );
END;
$$;


--
-- Name: mark_all_notifications_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_all_notifications_read(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE notifications
    SET is_read = true
    WHERE user_id = p_user_id AND is_read = false;
END;
$$;


--
-- Name: mark_reset_code_used(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_reset_code_used(reset_phone_number text, reset_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE password_reset_codes
    SET used = TRUE
    WHERE phone_number = reset_phone_number
      AND code = reset_code
      AND used = FALSE;
    
    RETURN FOUND;
END;
$$;


--
-- Name: notify_comment_reply(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_comment_reply() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_parent_comment_owner_id UUID;
    v_post_title TEXT;
BEGIN
    -- Only for replies (has parent_comment_id)
    IF NEW.parent_comment_id IS NOT NULL THEN
        -- Get parent comment owner
        SELECT user_id
        INTO v_parent_comment_owner_id
        FROM post_comments
        WHERE id = NEW.parent_comment_id;

        -- Get post title
        SELECT title
        INTO v_post_title
        FROM posts
        WHERE id = NEW.post_id;

        -- Create notification for parent comment owner
        PERFORM create_notification(
            v_parent_comment_owner_id,
            'COMMENT_REPLY',
            'Trả lời bình luận',
            'đã trả lời bình luận của bạn trong: "' || LEFT(v_post_title, 40) || '"',
            '/posts/' || NEW.post_id,
            NEW.user_id
        );
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: notify_new_follower(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_follower() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  follower_username TEXT;
  follower_avatar TEXT;
BEGIN
  -- Get follower info
  SELECT username, avatar_url INTO follower_username, follower_avatar
  FROM profiles WHERE id = NEW.follower_id;
  
  INSERT INTO notifications (user_id, type, title, message, link, actor_id, actor_username, actor_avatar)
  VALUES (
    NEW.following_id,
    'FOLLOW',
    'Người theo dõi mới',
    'đã bắt đầu theo dõi bạn',
    '/profile/' || NEW.follower_id,
    NEW.follower_id,
    follower_username,
    follower_avatar
  );
  RETURN NEW;
END;
$$;


--
-- Name: notify_post_comment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_post_comment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_post_owner_id UUID;
    v_post_title TEXT;
BEGIN
    -- Get post owner and title
    SELECT user_id, title
    INTO v_post_owner_id, v_post_title
    FROM posts
    WHERE id = NEW.post_id;

    -- Create notification for post owner
    PERFORM create_notification(
        v_post_owner_id,
        'POST_COMMENT',
        'Bình luận mới',
        'đã bình luận bài viết: "' || LEFT(v_post_title, 50) || '"',
        '/posts/' || NEW.post_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$;


--
-- Name: notify_post_like(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_post_like() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_post_owner_id UUID;
    v_post_title TEXT;
BEGIN
    -- Get post owner and title
    SELECT user_id, title
    INTO v_post_owner_id, v_post_title
    FROM posts
    WHERE id = NEW.post_id;

    -- Create notification
    PERFORM create_notification(
        v_post_owner_id,
        'POST_LIKE',
        'Thích bài viết',
        'đã thích bài viết của bạn: "' || LEFT(v_post_title, 50) || '"',
        '/posts/' || NEW.post_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$;


--
-- Name: notify_post_share(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_post_share() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_post_title TEXT;
BEGIN
    -- Get post title
    SELECT title
    INTO v_post_title
    FROM posts
    WHERE id = NEW.post_id;

    -- Create notification for original post owner
    PERFORM create_notification(
        NEW.original_user_id,
        'POST_SHARE',
        'Chia sẻ bài viết',
        'đã chia sẻ bài viết của bạn: "' || LEFT(v_post_title, 50) || '"',
        '/posts/' || NEW.post_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$;


--
-- Name: notify_project_followers_on_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_project_followers_on_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Only notify if project status or funding changed significantly
  IF (NEW.status != OLD.status) OR 
     (NEW.current_funding - OLD.current_funding >= 1000000) THEN
    
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT
      pf.user_id,
      'PROJECT_INVESTMENT',
      'Dự án có cập nhật',
      'Dự án "' || NEW.title || '" vừa có cập nhật mới',
      '/investments/project/' || NEW.id
    FROM project_follows pf
    WHERE pf.project_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_project_investment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_project_investment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_project_owner_id UUID;
    v_project_title TEXT;
BEGIN
    -- Get project owner and title
    SELECT user_id, title
    INTO v_project_owner_id, v_project_title
    FROM investment_projects
    WHERE id = NEW.project_id;

    -- Create notification
    PERFORM create_notification(
        v_project_owner_id,
        'PROJECT_INVESTMENT',
        'Đầu tư mới',
        'đã đầu tư vào dự án: "' || LEFT(v_project_title, 50) || '"',
        '/invest/' || NEW.project_id,
        NEW.investor_id
    );

    RETURN NEW;
END;
$$;


--
-- Name: notify_project_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_project_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_project_owner_id UUID;
    v_project_title TEXT;
BEGIN
    -- Get project owner and title
    SELECT user_id, title
    INTO v_project_owner_id, v_project_title
    FROM investment_projects
    WHERE id = NEW.project_id;

    -- Create notification
    PERFORM create_notification(
        v_project_owner_id,
        'PROJECT_RATING',
        'Đánh giá dự án',
        'đã đánh giá ' || NEW.rating || ' sao cho dự án: "' || LEFT(v_project_title, 40) || '"',
        '/invest/' || NEW.project_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$;


--
-- Name: request_password_reset(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_password_reset(reset_phone_number text) RETURNS TABLE(user_id uuid, username text, code text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_username TEXT;
    v_code TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Find user by phone number
    SELECT p.id, p.username INTO v_user_id, v_username
    FROM profiles p
    WHERE p.phone_number = reset_phone_number;

    -- If user not found, return empty result
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Generate 6-digit code
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Set expiration to 15 minutes from now
    v_expires_at := NOW() + INTERVAL '15 minutes';

    -- Insert reset code
    INSERT INTO password_reset_codes (user_id, code, phone_number, expires_at, used)
    VALUES (v_user_id, v_code, reset_phone_number, v_expires_at, FALSE);

    -- Return user info and code
    RETURN QUERY SELECT v_user_id, v_username, v_code, v_expires_at;
END;
$$;


--
-- Name: update_comment_like_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_comment_like_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.post_comments
        SET like_count = like_count + 1
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.post_comments
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: update_comment_reply_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_comment_reply_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
        UPDATE public.post_comments
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
        UPDATE public.post_comments
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = OLD.parent_comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: update_credit_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_credit_usage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.type = 'credit' AND NEW.status = 'completed' THEN
    -- Increase used credit
    UPDATE credit_limits
    SET used_credit = used_credit + NEW.final_amount,
        updated_at = NOW()
    WHERE customer_id = NEW.buyer_id
      AND business_id = NEW.seller_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_payment_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_payment_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_project_funding(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_funding() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status != 'confirmed') THEN
        UPDATE public.investment_projects
        SET current_funding = current_funding + NEW.amount
        WHERE id = NEW.project_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
        UPDATE public.investment_projects
        SET current_funding = current_funding - OLD.amount
        WHERE id = OLD.project_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_project_ratings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_ratings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_user_password(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_password(p_user_id uuid, p_new_password text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_email TEXT;
    v_encrypted_password TEXT;
BEGIN
    SELECT username || '@example.com' INTO v_email
    FROM profiles
    WHERE id = p_user_id;

    IF v_email IS NULL THEN
        RETURN FALSE;
    END IF;

    v_encrypted_password := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

    UPDATE auth.users
    SET 
        encrypted_password = v_encrypted_password,
        updated_at = NOW(),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        confirmation_token = NULL,
        recovery_token = NULL,
        email_change_token_new = NULL,
        email_change = NULL
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$;


--
-- Name: update_user_settings(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_settings(user_uuid uuid, settings_data jsonb) RETURNS public.user_settings
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  updated_settings user_settings;
BEGIN
  -- Ensure settings exist
  INSERT INTO user_settings (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update settings
  UPDATE user_settings
  SET
    language = COALESCE((settings_data->>'language')::TEXT, language),
    theme = COALESCE((settings_data->>'theme')::TEXT, theme),
    email_notifications = COALESCE((settings_data->>'email_notifications')::BOOLEAN, email_notifications),
    email_new_follower = COALESCE((settings_data->>'email_new_follower')::BOOLEAN, email_new_follower),
    email_post_like = COALESCE((settings_data->>'email_post_like')::BOOLEAN, email_post_like),
    email_post_comment = COALESCE((settings_data->>'email_post_comment')::BOOLEAN, email_post_comment),
    email_project_update = COALESCE((settings_data->>'email_project_update')::BOOLEAN, email_project_update),
    push_notifications = COALESCE((settings_data->>'push_notifications')::BOOLEAN, push_notifications),
    push_new_follower = COALESCE((settings_data->>'push_new_follower')::BOOLEAN, push_new_follower),
    push_post_like = COALESCE((settings_data->>'push_post_like')::BOOLEAN, push_post_like),
    push_post_comment = COALESCE((settings_data->>'push_post_comment')::BOOLEAN, push_post_comment),
    push_project_update = COALESCE((settings_data->>'push_project_update')::BOOLEAN, push_project_update),
    profile_visibility = COALESCE((settings_data->>'profile_visibility')::TEXT, profile_visibility),
    show_email = COALESCE((settings_data->>'show_email')::BOOLEAN, show_email),
    show_phone = COALESCE((settings_data->>'show_phone')::BOOLEAN, show_phone),
    allow_messages = COALESCE((settings_data->>'allow_messages')::BOOLEAN, allow_messages),
    show_activity = COALESCE((settings_data->>'show_activity')::BOOLEAN, show_activity),
    updated_at = NOW()
  WHERE user_id = user_uuid
  RETURNING * INTO updated_settings;
  
  RETURN updated_settings;
END;
$$;


--
-- Name: FUNCTION update_user_settings(user_uuid uuid, settings_data jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_user_settings(user_uuid uuid, settings_data jsonb) IS 'Update user settings';


--
-- Name: update_user_settings_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_settings_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_verification_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_verification_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: verify_password_reset_code(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_password_reset_code(reset_phone_number text, reset_code text) RETURNS TABLE(user_id uuid, username text, valid boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_username TEXT;
    v_code_record RECORD;
BEGIN
    -- Find valid reset code
    SELECT * INTO v_code_record
    FROM password_reset_codes
    WHERE phone_number = reset_phone_number
      AND code = reset_code
      AND used = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no valid code found, return invalid
    IF v_code_record IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE;
        RETURN;
    END IF;

    -- Get username from profiles
    SELECT p.id, p.username INTO v_user_id, v_username
    FROM profiles p
    WHERE p.id = v_code_record.user_id;

    -- Return user info
    RETURN QUERY SELECT v_user_id, v_username, TRUE;
END;
$$;


--
-- Name: admin_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action_type text NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reason text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admin_actions_action_type_check CHECK ((action_type = ANY (ARRAY['ban_user'::text, 'unban_user'::text, 'delete_post'::text, 'delete_product'::text, 'delete_project'::text, 'delete_comment'::text, 'approve_post'::text, 'reject_post'::text, 'approve_product'::text, 'reject_product'::text, 'approve_project'::text, 'reject_project'::text, 'change_role'::text, 'resolve_report'::text])))
);


--
-- Name: badge_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badge_definitions (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    color text NOT NULL,
    criteria_type text NOT NULL,
    criteria_value integer,
    display_order integer NOT NULL
);


--
-- Name: business_customer_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_customer_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    linked_at timestamp with time zone,
    customer_name text,
    customer_email text,
    customer_phone text,
    business_name text,
    notes text,
    requested_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT business_customer_links_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'inactive'::text, 'rejected'::text])))
);


--
-- Name: TABLE business_customer_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.business_customer_links IS 'Links between business accounts and customer accounts for order management';


--
-- Name: COLUMN business_customer_links.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_customer_links.status IS 'pending: waiting approval, active: linked, inactive: temporarily disabled, rejected: business declined';


--
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_likes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: contact_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    full_name text NOT NULL,
    phone_number text NOT NULL,
    email text NOT NULL,
    partnership_type text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contact_requests_partnership_type_check CHECK ((partnership_type = ANY (ARRAY['investor'::text, 'business'::text, 'research'::text, 'other'::text]))),
    CONSTRAINT contact_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'contacted'::text, 'completed'::text])))
);


--
-- Name: content_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    content_type text NOT NULL,
    content_id uuid NOT NULL,
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_note text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_reports_content_type_check CHECK ((content_type = ANY (ARRAY['post'::text, 'product'::text, 'project'::text, 'comment'::text, 'user'::text]))),
    CONSTRAINT content_reports_reason_check CHECK ((reason = ANY (ARRAY['spam'::text, 'inappropriate'::text, 'harassment'::text, 'misleading'::text, 'other'::text]))),
    CONSTRAINT content_reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text])))
);


--
-- Name: credit_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    credit_limit numeric(15,2) NOT NULL,
    used_credit numeric(15,2) DEFAULT 0,
    available_credit numeric(15,2) GENERATED ALWAYS AS ((credit_limit - used_credit)) STORED,
    default_term_days integer DEFAULT 30,
    default_interest_rate numeric(5,2) DEFAULT 0,
    default_late_fee_rate numeric(5,2) DEFAULT 2,
    is_active boolean DEFAULT true,
    approved_by uuid,
    approved_at timestamp with time zone,
    risk_level text DEFAULT 'medium'::text,
    credit_score integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    bank text DEFAULT 'vietcombank'::text,
    CONSTRAINT credit_limits_credit_limit_check CHECK ((credit_limit > (0)::numeric)),
    CONSTRAINT credit_limits_credit_score_check CHECK (((credit_score >= 0) AND (credit_score <= 1000))),
    CONSTRAINT credit_limits_default_interest_rate_check CHECK ((default_interest_rate >= (0)::numeric)),
    CONSTRAINT credit_limits_default_late_fee_rate_check CHECK ((default_late_fee_rate >= (0)::numeric)),
    CONSTRAINT credit_limits_default_term_days_check CHECK ((default_term_days > 0)),
    CONSTRAINT credit_limits_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT credit_limits_used_credit_check CHECK ((used_credit >= (0)::numeric))
);


--
-- Name: COLUMN credit_limits.bank; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credit_limits.bank IS 'Ngân hàng được sử dụng cho hạn mức tín dụng';


--
-- Name: financial_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    discount_rate numeric(5,2),
    advance_rate numeric(5,2),
    processing_fee numeric(5,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT financial_partners_advance_rate_check CHECK (((advance_rate >= (0)::numeric) AND (advance_rate <= (100)::numeric))),
    CONSTRAINT financial_partners_discount_rate_check CHECK (((discount_rate >= (0)::numeric) AND (discount_rate <= (100)::numeric))),
    CONSTRAINT financial_partners_type_check CHECK ((type = ANY (ARRAY['bank'::text, 'fintech'::text, 'investor'::text, 'other'::text])))
);


--
-- Name: investment_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investment_projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    funding_goal bigint NOT NULL,
    current_funding bigint DEFAULT 0,
    farmers_impacted integer DEFAULT 0,
    area text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    image_url text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    moderation_status text DEFAULT 'pending'::text,
    moderation_note text,
    moderated_by uuid,
    moderated_at timestamp with time zone,
    CONSTRAINT investment_projects_current_funding_check CHECK ((current_funding >= 0)),
    CONSTRAINT investment_projects_farmers_impacted_check CHECK ((farmers_impacted >= 0)),
    CONSTRAINT investment_projects_funding_goal_check CHECK ((funding_goal > 0)),
    CONSTRAINT investment_projects_moderation_status_check CHECK ((moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT investment_projects_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'funded'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    actor_id uuid,
    actor_username text,
    actor_avatar text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['POST_LIKE'::text, 'POST_COMMENT'::text, 'COMMENT_REPLY'::text, 'POST_SHARE'::text, 'PROJECT_INVESTMENT'::text, 'PROJECT_RATING'::text, 'PRODUCT_VIEW_MILESTONE'::text, 'FOLLOW'::text, 'MENTION'::text, 'POST_APPROVED'::text, 'PRODUCT_APPROVED'::text, 'PROJECT_APPROVED'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    phone_number text,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    phone_number text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_installments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    receivable_id uuid,
    installment_number integer NOT NULL,
    total_installments integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    paid_amount numeric(15,2) DEFAULT 0,
    remaining_amount numeric(15,2) GENERATED ALWAYS AS ((amount - paid_amount)) STORED,
    due_date timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    payment_reference text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT installment_valid_number CHECK ((installment_number <= total_installments)),
    CONSTRAINT payment_installments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_installments_installment_number_check CHECK ((installment_number > 0)),
    CONSTRAINT payment_installments_paid_amount_check CHECK ((paid_amount >= (0)::numeric)),
    CONSTRAINT payment_installments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'waived'::text]))),
    CONSTRAINT payment_installments_total_installments_check CHECK ((total_installments > 0))
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_code text DEFAULT public.generate_transaction_code() NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    buyer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    product_id uuid,
    amount numeric(15,2) NOT NULL,
    discount_amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    final_amount numeric(15,2) NOT NULL,
    payment_method text,
    payment_provider text,
    payment_reference text,
    credit_term_days integer,
    due_date timestamp with time zone,
    interest_rate numeric(5,2) DEFAULT 0,
    late_fee_rate numeric(5,2) DEFAULT 0,
    paid_amount numeric(15,2) DEFAULT 0,
    remaining_amount numeric(15,2),
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    verification_document_id uuid,
    CONSTRAINT payment_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_transactions_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT payment_transactions_final_amount_check CHECK ((final_amount > (0)::numeric)),
    CONSTRAINT payment_transactions_paid_amount_check CHECK ((paid_amount >= (0)::numeric)),
    CONSTRAINT payment_transactions_payment_method_check CHECK ((payment_method = ANY (ARRAY['bank_transfer'::text, 'e_wallet'::text, 'credit_card'::text, 'cash'::text, 'credit'::text]))),
    CONSTRAINT payment_transactions_remaining_amount_check CHECK ((remaining_amount >= (0)::numeric)),
    CONSTRAINT payment_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'pending_verification'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text]))),
    CONSTRAINT payment_transactions_tax_amount_check CHECK ((tax_amount >= (0)::numeric)),
    CONSTRAINT payment_transactions_type_check CHECK ((type = ANY (ARRAY['immediate'::text, 'credit'::text, 'installment'::text, 'refund'::text])))
);


--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_comment_id uuid,
    reply_count integer DEFAULT 0,
    like_count integer DEFAULT 0,
    CONSTRAINT post_comments_like_count_check CHECK ((like_count >= 0)),
    CONSTRAINT post_comments_reply_count_check CHECK ((reply_count >= 0))
);


--
-- Name: post_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_images (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    caption text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_likes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: post_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_shares (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    original_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: post_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_videos (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    video_url text NOT NULL,
    thumbnail_url text,
    duration integer,
    file_size bigint,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: post_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid,
    viewed_at timestamp with time zone DEFAULT now()
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text NOT NULL,
    image_url text,
    product_link text,
    views_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    moderation_status text DEFAULT 'pending'::text,
    moderation_note text,
    moderated_by uuid,
    moderated_at timestamp with time zone,
    CONSTRAINT posts_category_check CHECK ((category = ANY (ARRAY['experience'::text, 'salinity-solution'::text, 'product'::text]))),
    CONSTRAINT posts_moderation_status_check CHECK ((moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid,
    product_id uuid,
    discount_percentage numeric(5,2) DEFAULT 0,
    fixed_discount numeric(15,2) DEFAULT 0,
    special_price numeric(15,2),
    credit_term_days integer,
    interest_rate numeric(5,2),
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_rules_discount_percentage_check CHECK (((discount_percentage >= (0)::numeric) AND (discount_percentage <= (100)::numeric))),
    CONSTRAINT pricing_rules_fixed_discount_check CHECK ((fixed_discount >= (0)::numeric))
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_videos (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    video_url text NOT NULL,
    thumbnail_url text,
    duration integer,
    file_size bigint,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_views (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid,
    viewed_at timestamp with time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price numeric(12,2) NOT NULL,
    category text NOT NULL,
    image_url text,
    contact text NOT NULL,
    views_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    moderation_status text DEFAULT 'pending'::text,
    moderation_note text,
    moderated_by uuid,
    moderated_at timestamp with time zone,
    CONSTRAINT products_moderation_status_check CHECK ((moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    phone_number text,
    role text DEFAULT 'farmer'::text NOT NULL,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    points integer DEFAULT 0,
    avatar_url text,
    is_admin boolean DEFAULT false,
    is_banned boolean DEFAULT false,
    banned_reason text,
    banned_at timestamp with time zone,
    banned_by uuid,
    CONSTRAINT phone_format CHECK (((phone_number IS NULL) OR (phone_number ~ '^\+?[0-9]{10,15}$'::text))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['farmer'::text, 'business'::text]))),
    CONSTRAINT username_format CHECK ((username ~ '^[a-zA-Z0-9_]+$'::text)),
    CONSTRAINT username_length CHECK (((char_length(username) >= 3) AND (char_length(username) <= 20)))
);


--
-- Name: project_follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE project_follows; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_follows IS 'User following investment projects';


--
-- Name: project_investments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_investments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    investor_id uuid NOT NULL,
    amount bigint NOT NULL,
    investor_name text NOT NULL,
    investor_email text,
    investor_phone text,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_type text NOT NULL,
    CONSTRAINT project_investments_amount_check CHECK ((amount > 0)),
    CONSTRAINT project_investments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT project_investments_user_type_check CHECK ((user_type = ANY (ARRAY['farmer'::text, 'business'::text])))
);


--
-- Name: COLUMN project_investments.investor_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_investments.investor_email IS 'Email is optional for farmers, required for businesses';


--
-- Name: COLUMN project_investments.user_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_investments.user_type IS 'Type of investor: farmer (email optional) or business (email required)';


--
-- Name: project_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    review text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: prophet_predict; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prophet_predict (
    id bigint NOT NULL,
    ngay date NOT NULL,
    nam smallint NOT NULL,
    thang smallint NOT NULL,
    tinh character varying(255) NOT NULL,
    ten_tram character varying(255) NOT NULL,
    lon numeric(10,6) NOT NULL,
    lat numeric(10,6) NOT NULL,
    du_bao_man numeric(10,2) NOT NULL,
    lower_ci numeric(10,2) NOT NULL,
    upper_ci numeric(10,2) NOT NULL,
    he_so_vi_tri numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prophet_predict_du_bao_man_check CHECK ((du_bao_man >= (0)::numeric)),
    CONSTRAINT prophet_predict_thang_check CHECK (((thang >= 1) AND (thang <= 12)))
);


--
-- Name: TABLE prophet_predict; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prophet_predict IS 'Dữ liệu dự báo độ mặn theo THÁNG (Monthly Forecast)';


--
-- Name: COLUMN prophet_predict.ngay; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prophet_predict.ngay IS 'Ngày đại diện (YYYY-MM-01) để vẽ biểu đồ';


--
-- Name: COLUMN prophet_predict.du_bao_man; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prophet_predict.du_bao_man IS 'Độ mặn trung bình tháng (g/l)';


--
-- Name: prophet_predict_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.prophet_predict ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.prophet_predict_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: receivables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receivables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    invoice_number text DEFAULT public.generate_invoice_number() NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    original_amount numeric(15,2) NOT NULL,
    outstanding_amount numeric(15,2) NOT NULL,
    paid_amount numeric(15,2) DEFAULT 0,
    interest_amount numeric(15,2) DEFAULT 0,
    late_fee_amount numeric(15,2) DEFAULT 0,
    due_date timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    is_discounted boolean DEFAULT false,
    discount_rate numeric(5,2),
    discounted_amount numeric(15,2),
    discounted_to text,
    discounted_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone,
    CONSTRAINT receivables_interest_amount_check CHECK ((interest_amount >= (0)::numeric)),
    CONSTRAINT receivables_late_fee_amount_check CHECK ((late_fee_amount >= (0)::numeric)),
    CONSTRAINT receivables_original_amount_check CHECK ((original_amount > (0)::numeric)),
    CONSTRAINT receivables_outstanding_amount_check CHECK ((outstanding_amount >= (0)::numeric)),
    CONSTRAINT receivables_paid_amount_check CHECK ((paid_amount >= (0)::numeric)),
    CONSTRAINT receivables_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'written_off'::text, 'discounted'::text])))
);


--
-- Name: receivables_with_overdue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.receivables_with_overdue AS
 SELECT id,
    transaction_id,
    invoice_number,
    business_id,
    customer_id,
    original_amount,
    outstanding_amount,
    paid_amount,
    interest_amount,
    late_fee_amount,
    due_date,
    status,
    is_discounted,
    discount_rate,
    discounted_amount,
    discounted_to,
    discounted_at,
    notes,
    created_at,
    updated_at,
    paid_at,
        CASE
            WHEN ((due_date < now()) AND (outstanding_amount > (0)::numeric)) THEN (EXTRACT(day FROM (now() - due_date)))::integer
            ELSE 0
        END AS days_overdue
   FROM public.receivables r;


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    badge_id text NOT NULL,
    earned_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_follows_no_self_follow CHECK ((follower_id <> following_id))
);


--
-- Name: TABLE user_follows; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_follows IS 'User following relationships';


--
-- Name: user_post_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_post_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    post_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: verification_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    transaction_id uuid,
    document_type text DEFAULT 'farming_certificate'::text NOT NULL,
    document_url text NOT NULL,
    reference_link text,
    status text DEFAULT 'pending'::text NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT verification_documents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: TABLE verification_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.verification_documents IS 'Stores farmer verification documents for credit purchases';


--
-- Name: COLUMN verification_documents.document_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification_documents.document_type IS 'Type of verification document (e.g., farming_certificate)';


--
-- Name: COLUMN verification_documents.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification_documents.status IS 'pending, approved, or rejected';


--
-- Name: COLUMN verification_documents.verified_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification_documents.verified_by IS 'Business user who verified the document';


--
-- Data for Name: admin_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_actions (id, admin_id, action_type, target_type, target_id, reason, metadata, created_at) FROM stdin;
6e5cb28d-afaa-4f27-9b5d-c28709ac6dc5	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ban_user	user	344b49b7-2784-4453-8732-b03ad4a571bf	test	\N	2026-01-17 16:42:15.930396+00
fb3aea04-89a5-4132-917a-19e6c92d6625	37f5ce8a-f218-4ec7-87d0-52967b78be4e	unban_user	user	344b49b7-2784-4453-8732-b03ad4a571bf	test	\N	2026-01-17 16:45:49.408601+00
71387de2-0c4e-4370-b4e5-c6de6b64c68e	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ban_user	user	344b49b7-2784-4453-8732-b03ad4a571bf	test	\N	2026-01-17 16:45:56.89243+00
60c54851-6df7-446a-a52a-b207f4c0bd7d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	unban_user	user	344b49b7-2784-4453-8732-b03ad4a571bf	tesst	\N	2026-01-17 16:49:54.112023+00
86b98a91-7784-49c4-bbd7-b3a9457dba14	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ban_user	user	344b49b7-2784-4453-8732-b03ad4a571bf	test	\N	2026-01-17 16:50:03.06065+00
23cb4b21-e1ac-4c11-9042-ac452edf2a39	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ban_user	user	b84557f5-40ad-4376-8d50-cdf78aac9c07	test	\N	2026-01-17 16:52:47.940226+00
69e02e19-98a2-466a-b5e9-4fe792c1fcc1	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	c645beab-2120-46e5-b25b-a348a2ad3ed5	test	\N	2026-01-17 17:08:52.110715+00
f883ae9e-8ffa-4e3e-9fed-8e0712f9c7aa	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	61cb5cb7-7145-4d47-a87b-53e6a21e35b0	test	\N	2026-01-17 17:19:28.18876+00
2dc1ffd6-f752-4aed-9ef5-c859d94c582c	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	816d47d4-9d86-4c96-94e7-acb3ba3e7829	test	\N	2026-01-17 17:19:45.763001+00
c9790755-cecd-40a5-b650-1653fe501167	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	e903e446-de36-4ee5-9230-eb16e3390465	\N	{"new_status": "approved"}	2026-01-17 17:31:35.9961+00
5b8e40e7-0023-4481-90f0-1672f24b7588	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	103ee241-d0b0-4a7c-8157-889c0a3bc5a0	\N	{"new_status": "approved"}	2026-01-17 17:34:52.136173+00
4526e928-0f66-44dd-a652-0b9f9361b96e	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_project	project	1631e8f0-dc84-455d-82b8-58f239532ea4	\N	{"new_status": "approved"}	2026-01-17 17:36:00.888677+00
98c98f32-cf95-4c5b-bb45-5645be1e7f5c	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	\N	{"new_status": "approved"}	2026-01-21 04:46:09.404688+00
66ace71d-f618-459c-b089-440ccd2078c0	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	1ba62bab-eb10-44e0-9e6b-ff0ef1ef7932	\N	{"new_status": "approved"}	2026-01-21 04:48:21.135826+00
40a8a304-c3d6-4299-8665-1a409bac2e09	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	f6116533-3198-40cf-9561-72cb910ae513	\N	{"new_status": "approved"}	2026-01-21 04:57:17.215387+00
3fcba177-bd6e-4b4e-b025-1300dff919a7	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	f6116533-3198-40cf-9561-72cb910ae513	xóa	\N	2026-01-21 05:44:29.633132+00
04073959-1688-4083-90a6-ecbc7d47d84a	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	65fedb77-6c5d-4928-8288-391c118a98dd	xóa	\N	2026-01-21 05:45:00.439869+00
97735e92-dff0-401c-8d75-6b60f26d93b8	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	dbdf1358-22d8-4ba9-8c5b-42d023ada69e	xóa	\N	2026-01-21 05:45:09.655246+00
9ef38f52-9287-4f42-91e5-d1f5b194ac21	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	4850c8ac-9d0f-4c72-8855-82b3d362a4c1	xóa	\N	2026-01-21 05:45:42.324208+00
9ab73488-c8d5-449a-ba8b-4ec42c9d582e	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	260cbf89-ff39-4a2d-8250-dbb593547c3f	xóa	\N	2026-01-21 05:45:51.953707+00
f16dc00c-a7bc-4ef3-90ce-3a32d10d50ce	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	17628ef2-1c24-4c1b-b311-f248e3e1fa8f	xóa	\N	2026-01-21 05:46:13.542039+00
76d2f88b-9960-4018-879c-fb74386f0c8c	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	b09fc1e7-aefc-4f82-bd88-b4c7399b7fbf	xóa	\N	2026-01-21 05:46:22.553971+00
d9c40368-7a2a-4f84-a453-d9d63ab37721	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	b85b3185-f499-431f-bbdf-40ae298a47e0	xóa	\N	2026-01-21 05:46:30.647945+00
d1fb056e-daf8-4407-be50-7a0d037bbaa5	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	954d5c9c-9e82-402e-82a7-152e56303e43	xóa	\N	2026-01-21 05:46:38.349614+00
d5a3dcc3-f0ca-4c5a-bc31-e9da38206552	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	1551ab8c-f57a-4399-ad9c-94eb815d19dc	xóa	\N	2026-01-21 05:46:47.46423+00
97730657-3277-4a17-ad03-9390d30c4253	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	5609c353-2176-41dc-86b9-79d5fa830e9f	xóa	\N	2026-01-21 05:46:54.814766+00
481e2d27-9e72-41d9-a135-98cd05c38ac2	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	bfcd933d-8c7f-4d71-b144-df87ecf35156	xóa	\N	2026-01-21 05:47:05.273454+00
e9b394f1-50cb-48b0-931f-a703580211b3	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	8a2ae4b7-3e76-48f1-9cca-260a0a58fe44	xóa	\N	2026-01-21 05:47:13.711916+00
53bc5267-db90-4143-8074-6799a20c709f	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	20ce8ce9-19b0-4e67-983a-3be93221a314	xóa	\N	2026-01-21 05:47:22.193732+00
0a8eab38-d4b2-4d46-881d-9c69e5ad5fdf	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	103ee241-d0b0-4a7c-8157-889c0a3bc5a0	xóa	\N	2026-01-21 05:47:38.613623+00
8daf827d-6ef3-49e6-9b98-dc3dda8a16a3	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	1d24a3eb-d13d-4fdc-95e5-86e0a1ff619a	xóa	\N	2026-01-21 05:47:49.984036+00
eac2fb3a-4890-41ee-8912-af3afea47af1	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	2bb47db0-0062-4e0b-a687-7437e2c32a5e	xóa	\N	2026-01-21 05:47:57.997218+00
320d9c20-813a-45db-ba3f-69c614c5c6e4	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	e92b298d-ac56-403b-aa2f-4d36d9e843c8	\N	{"new_status": "approved"}	2026-01-21 06:42:50.024721+00
7f18b7aa-4167-4f44-9686-43bc22c2ce4c	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	e6b29f58-e106-46c6-9eab-a1c2f119493b	\N	{"new_status": "approved"}	2026-01-21 07:03:48.847735+00
f3a8ca6d-7b1e-4e38-9d54-d3605adaea48	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	\N	{"new_status": "approved"}	2026-01-21 07:14:41.220579+00
8c29b6ef-da68-4663-b597-86698ef73711	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	\N	{"new_status": "approved"}	2026-01-21 07:49:26.316713+00
2c1dace3-d358-44cf-8f1b-8082890ad262	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_project	project	4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	\N	{"new_status": "approved"}	2026-01-21 08:02:05.889074+00
16853841-b7ab-4b15-be4d-ab7fac466710	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	\N	{"new_status": "approved"}	2026-01-21 09:01:07.035977+00
994c4674-51c4-4c53-af67-24d280a86a2b	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	50add762-607c-41c0-af4a-4cee5e42f262	\N	{"new_status": "approved"}	2026-01-21 09:43:15.605161+00
6ff5604e-8a31-4dec-8380-4c1e55980dcc	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	8a0268f3-71d0-4877-9305-bfc113a5367b	test	\N	2026-01-23 09:02:23.841703+00
8ca5a302-60cd-42bb-8711-0105371d37a1	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	e92b298d-ac56-403b-aa2f-4d36d9e843c8	delete	\N	2026-01-24 02:38:43.049414+00
a73671f9-df57-4024-8dcb-8183d5936308	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	50add762-607c-41c0-af4a-4cee5e42f262	delete	\N	2026-01-24 02:38:59.781132+00
2792ff0d-9565-4b22-b9e5-358724f54e9b	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	test	\N	2026-01-24 02:41:30.757916+00
7eb64137-cd63-4ca4-9be5-10896ea1165e	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	d7fcc921-43fc-4970-a35e-de2688db45a4	test	\N	2026-01-24 02:41:42.054573+00
a2a65bee-4907-4c50-b9da-2f0e10768beb	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	535b8da2-0d19-4b84-9eb3-e59ee5a286c1	test	\N	2026-01-24 02:41:53.582767+00
0cf9bd8a-f909-48d8-ba7c-b884d091a4bb	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	b66500b5-91bd-479b-9d66-b2db7e67bbf7	\N	{"new_status": "approved"}	2026-01-24 03:30:11.797139+00
d2626b28-273a-489b-abde-2fc4709b75d1	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	b0c9fb25-468e-4728-aef1-e4628f99d452	\N	{"new_status": "approved"}	2026-01-24 03:30:15.254245+00
ba37c9c5-87b7-4194-9cdb-85742bd39cf6	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	1d12d85d-7061-448b-85fd-db8470c87539	\N	{"new_status": "approved"}	2026-01-24 18:21:27.45819+00
7595b5b7-2223-4478-b636-1fc3373df13f	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	a6a59f6a-e3dc-4426-b06d-6bf7d118990f	\N	{"new_status": "approved"}	2026-01-24 18:23:49.295737+00
39241c01-fdd9-4642-8292-fb56ba80b1e7	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	\N	{"new_status": "approved"}	2026-01-25 01:35:46.941643+00
d3726abc-addc-4a41-a384-abb2e7932058	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	5678d71b-ef27-482b-a2a0-08be5ca48451	\N	{"new_status": "approved"}	2026-01-25 01:35:50.893251+00
c3b4a65a-3141-4f05-af23-34d9880f6d70	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_project	project	ede26cd1-eb56-4c6a-8d7c-005227237517	\N	{"new_status": "approved"}	2026-01-25 01:35:57.585945+00
b55d0f75-8f62-4aec-ade7-7bb03e1f678d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	a6a59f6a-e3dc-4426-b06d-6bf7d118990f	delete	\N	2026-01-25 01:46:36.116375+00
1b817e83-6639-43c0-bff9-a2e9a3a60037	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	8ef76374-c486-4e2d-811a-0b82ad202333	\N	{"new_status": "approved"}	2026-01-25 03:47:15.905498+00
d42cd051-d507-48a9-b33e-e9cecf493ff8	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	1d12d85d-7061-448b-85fd-db8470c87539	delete	\N	2026-01-25 03:58:44.018966+00
42691610-fe6b-48cd-9d01-a7fdc8fb8ba5	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	b66500b5-91bd-479b-9d66-b2db7e67bbf7	delete	\N	2026-01-25 03:58:51.697431+00
ce493cb8-d8d6-4d31-ab46-0ae762f59cf9	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_product	product	b0c9fb25-468e-4728-aef1-e4628f99d452	delete	\N	2026-01-25 03:58:57.316773+00
c6523c9a-a9dc-4334-af56-bebefea8fc82	37f5ce8a-f218-4ec7-87d0-52967b78be4e	reject_post	post	5133c21a-fcf7-4021-8bcb-448a3586408d	Không liên quan đến app	{"new_status": "rejected"}	2026-03-24 15:08:16.047579+00
f8eb9426-a14f-4306-adbe-7c126d8d8e0a	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_product	product	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	\N	{"new_status": "approved"}	2026-03-28 02:45:28.083846+00
f39d8aee-cf0f-417e-ac07-8b7ed3402b32	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ban_user	user	c69d726e-a55a-4e43-ac7b-270a4ab83e85	.	\N	2026-03-28 02:45:43.135234+00
8e7d0062-94db-42fb-baa2-a60f8c34d066	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ban_user	user	9d0ef483-3495-446e-a744-f290c1e4d509	.	\N	2026-03-28 02:45:52.372047+00
8da6af19-ecf9-42a5-a1d2-2c0101f45138	37f5ce8a-f218-4ec7-87d0-52967b78be4e	delete_post	post	ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	Bị hạn chế không hợp lệ tiêu chuẩn cộng đồng	\N	2026-04-02 12:13:10.74555+00
3ca0ed07-9b33-4801-8d66-80e233633977	37f5ce8a-f218-4ec7-87d0-52967b78be4e	approve_post	post	dad214d1-eab3-4cb9-b3a9-45de14b2e778	\N	{"new_status": "approved"}	2026-06-09 15:25:00.361963+00
\.


--
-- Data for Name: badge_definitions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.badge_definitions (id, name, description, icon, color, criteria_type, criteria_value, display_order) FROM stdin;
first_post	First Post	Đăng bài đầu tiên	🎯	#FFD700	post_count	1	1
helpful_contributor	Helpful Contributor	Nhận 100 likes	❤️	#FF69B4	total_likes	100	2
active_member	Active Member	Đăng bài 30 ngày liên tục	🔥	#FF4500	consecutive_days	30	3
investor	Investor	Đầu tư vào 5 dự án	💼	#10B981	investment_count	5	4
\.


--
-- Data for Name: business_customer_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_customer_links (id, business_id, customer_id, status, linked_at, customer_name, customer_email, customer_phone, business_name, notes, requested_by, approved_by, approved_at, created_at, updated_at) FROM stdin;
26e087ce-85eb-4258-83e4-7354eaffee1a	ca24214f-9f3f-40f2-8c59-900f3124c5c8	4ee915ec-4c50-4adf-9650-ea4ee740210f	active	2026-01-24 03:31:09.282+00	lochuynh	\N	+84889324816	nab	\N	4ee915ec-4c50-4adf-9650-ea4ee740210f	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-24 03:31:09.282+00	2026-01-24 03:31:09.481621+00	2026-01-24 03:31:09.481621+00
ed406a83-a528-422c-a652-06fb0c2a56c6	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	5d100834-5494-4217-ac7c-e02053c4f016	active	2026-01-25 04:22:19.824+00	lamchihien	\N	+84987654567	vinafoodii	\N	5d100834-5494-4217-ac7c-e02053c4f016	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-25 04:22:19.824+00	2026-01-25 04:22:19.918451+00	2026-01-25 04:22:19.918451+00
a3cd87dc-bab9-423e-803c-f59dc9fa349f	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	e30a9483-72fc-424d-9617-0e5e040ce685	active	2026-01-25 06:37:53.455+00	lovenab	\N	+84585708372	vinafoodii	\N	e30a9483-72fc-424d-9617-0e5e040ce685	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-25 06:37:53.455+00	2026-01-25 06:37:53.669158+00	2026-01-25 06:37:53.669158+00
87daac77-b8d0-496b-88ea-4ad3f71d4ba2	ca24214f-9f3f-40f2-8c59-900f3124c5c8	5d100834-5494-4217-ac7c-e02053c4f016	active	2026-01-27 14:13:25.859+00	lamchihien	\N	+84987654567	nab	\N	5d100834-5494-4217-ac7c-e02053c4f016	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-27 14:13:25.859+00	2026-01-27 14:13:26.009126+00	2026-01-27 14:13:26.009126+00
1747d040-f700-44a1-ab7d-48c51bf9e213	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	6c45203b-a5ff-4f1c-be40-6bce6188f757	active	2026-02-08 16:51:58.783+00	nguyenvanb	\N	+84585708372	vinafoodii	\N	6c45203b-a5ff-4f1c-be40-6bce6188f757	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-02-08 16:51:58.783+00	2026-02-08 16:51:59.733872+00	2026-02-08 16:51:59.733872+00
97ed0721-d651-4c01-bfcb-afb9d01f1c40	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	55cc2f62-282e-455d-8d90-675dae449f45	active	2026-03-13 14:21:31.701+00	npc	\N	+84384436680	vinafoodii	\N	55cc2f62-282e-455d-8d90-675dae449f45	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-03-13 14:21:31.701+00	2026-03-13 14:21:31.849627+00	2026-03-13 14:21:31.849627+00
31192e28-1de8-4f88-be05-982fc4f0b006	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	4e9dd36c-38f2-4353-a320-0c31fa3cc970	active	2026-03-25 10:41:35.455+00	nguyentankhiem123	\N	+84819447753	vinafoodii	\N	4e9dd36c-38f2-4353-a320-0c31fa3cc970	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-03-25 10:41:35.458+00	2026-03-25 10:41:35.484403+00	2026-03-25 10:41:35.484403+00
b6bb3f2a-88d0-4d5a-93aa-9035702415ef	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	9d0ef483-3495-446e-a744-f290c1e4d509	active	2026-03-25 10:48:30.725+00	tankhiem123	\N	+84819447753	vinafoodii	\N	9d0ef483-3495-446e-a744-f290c1e4d509	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-03-25 10:48:30.725+00	2026-03-25 10:48:31.496037+00	2026-03-25 10:48:31.496037+00
a54fd4e5-c63e-40f0-a373-28be672754fa	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2374dd2e-e380-45d4-a350-bedbaae40ad0	active	2026-03-28 02:36:59.85+00	nhatnam	\N	+84585708372	nab	\N	2374dd2e-e380-45d4-a350-bedbaae40ad0	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-03-28 02:36:59.85+00	2026-03-28 02:37:01.868573+00	2026-03-28 02:37:01.868573+00
e500831e-cbdd-4181-b8dc-a0139abe269b	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2374dd2e-e380-45d4-a350-bedbaae40ad0	active	2026-03-28 02:37:42.977+00	nhatnam	\N	+84585708372	vinafoodii	\N	2374dd2e-e380-45d4-a350-bedbaae40ad0	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-03-28 02:37:42.977+00	2026-03-28 02:37:44.975219+00	2026-03-28 02:37:44.975219+00
ec6ab020-9485-46b1-92d3-26e880635873	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	37f5ce8a-f218-4ec7-87d0-52967b78be4e	active	2026-03-30 05:35:44.77+00	dat	\N	+84399746611	vinafoodii	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-03-30 05:35:44.77+00	2026-03-30 05:35:47.83719+00	2026-03-30 05:35:47.83719+00
370ab3b5-6938-4f28-be4c-1d373da2b822	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	active	2026-03-30 10:07:50.403+00	phdhoanganh	\N	+84585708372	vinafoodii	\N	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-03-30 10:07:50.405+00	2026-03-30 10:07:50.618072+00	2026-03-30 10:07:50.618072+00
98211118-a7a6-47e6-843b-42ffdb41359d	ca24214f-9f3f-40f2-8c59-900f3124c5c8	37f5ce8a-f218-4ec7-87d0-52967b78be4e	active	2026-04-02 12:11:02.642+00	dat	\N	+84399746611	nab	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-04-02 12:11:02.642+00	2026-04-02 12:11:02.876211+00	2026-04-02 12:11:02.876211+00
79ff8837-1540-4427-bb78-521baf5c3bdd	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	37f5ce8a-f218-4ec7-87d0-52967b78be4e	active	2026-04-02 12:18:48.381+00	dat	\N	+84399746611	hihi	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	2026-04-02 12:18:48.381+00	2026-04-02 12:18:48.548758+00	2026-04-02 12:18:48.548758+00
4911146a-2fea-4276-a3bc-0615616cf990	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	660e5db2-b63a-4a80-9e03-61b9676a25f0	active	2026-04-04 14:10:49.615+00	anhtu	\N	+84585708374	vinafoodii	\N	660e5db2-b63a-4a80-9e03-61b9676a25f0	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-04-04 14:10:49.616+00	2026-04-04 14:10:50.474017+00	2026-04-04 14:10:50.474017+00
ca4d0c39-a75a-47e6-8b69-581afbae014f	ca24214f-9f3f-40f2-8c59-900f3124c5c8	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	active	2026-04-06 18:18:08.465+00	phdhoanganh	\N	+84585708372	nab	\N	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-04-06 18:18:08.466+00	2026-04-06 18:18:08.755397+00	2026-04-06 18:18:08.755397+00
bb2c723c-ddd4-4523-86b6-063c1feb2f4e	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	active	2026-04-12 06:43:26.046+00	sharkhoanganh	\N	+84585708372	vinafoodii	\N	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-04-12 06:43:26.046+00	2026-04-12 06:43:26.413424+00	2026-04-12 06:43:26.413424+00
42a6317c-c913-4825-81ba-4fd4d17a50da	ca24214f-9f3f-40f2-8c59-900f3124c5c8	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	active	2026-04-12 06:44:10.02+00	sharkhoanganh	\N	+84585708372	nab	\N	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-04-12 06:44:10.02+00	2026-04-12 06:44:10.321871+00	2026-04-12 06:44:10.321871+00
e2fb085b-fddd-4054-8d5d-b9d0a0244310	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	ef593d11-dafa-4203-8b38-217cb6ece842	active	2026-09-04 07:04:43.295+00	eureka	\N	+84585708372	vinafoodii	\N	ef593d11-dafa-4203-8b38-217cb6ece842	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-09-04 07:04:43.295+00	2026-09-04 07:04:43.612407+00	2026-09-04 07:04:43.612407+00
e91cb070-9ab1-4631-af8b-6ab1d28ccb96	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8e5489ab-5339-4864-aa29-845a32684bdf	active	2026-09-06 14:10:58.937+00	startupzonex_2026	\N	+84345678910	vinafoodii	\N	8e5489ab-5339-4864-aa29-845a32684bdf	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-09-06 14:10:58.938+00	2026-09-06 14:10:59.847256+00	2026-09-06 14:10:59.847256+00
8b8c9c21-c9ca-43f2-ab79-6a801c2d277f	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	active	2026-09-08 12:12:42.629+00	duchiep	\N	+84963909735	vinafoodii	\N	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-09-08 12:12:42.63+00	2026-09-08 12:12:42.029733+00	2026-09-08 12:12:42.029733+00
\.


--
-- Data for Name: comment_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comment_likes (id, comment_id, user_id, created_at) FROM stdin;
29bca141-ca0f-432d-b37f-e0e17c6075a5	a3005438-e8a6-4426-b90d-5cfaf3f03dd3	9251db17-0835-41c7-8469-28dee88096b1	2026-01-19 14:37:43.799255+00
b1e2306a-5e95-462a-a775-08bfc23e17a3	9a156e5f-1723-49e6-93c7-0ff0bd18ccb2	9251db17-0835-41c7-8469-28dee88096b1	2026-01-19 14:37:45.09725+00
f057fd4b-24f3-4b07-830d-12ec859e05ea	11d4c8b4-295a-4dfa-8b7a-3106f01d4e90	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-04-02 12:11:12.422623+00
45b5b35c-a056-4b2b-b4ab-98be2a1f4c6f	299bfa15-2927-4f1c-80aa-93695dbdb355	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-04-02 12:11:14.544951+00
\.


--
-- Data for Name: contact_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_requests (id, full_name, phone_number, email, partnership_type, message, status, created_at, updated_at) FROM stdin;
d7dc0c19-3ce5-4cf6-acc3-b5dd226d2fb7	Nguyễn Văn A	0399746612	test24@gmail.com	investor	test	pending	2026-01-04 16:07:36.304385+00	2026-01-04 16:07:36.304385+00
bfa31eb7-a62a-4e67-bf71-c914a061e9db	test1	0399746612	test@gmail.com	research	test	pending	2026-01-04 16:13:16.335133+00	2026-01-04 16:13:16.335133+00
eb668074-cf0a-4b6f-8628-e0002397db97	test	0399746612	test@gmail.com	investor	test	pending	2026-01-04 16:53:38.565706+00	2026-01-04 16:53:38.565706+00
0d3700a8-0ce2-49cb-8f70-b02beff25a66	test1	0399746612	test@gmail.com	investor	test	pending	2026-01-04 16:54:10.100073+00	2026-01-04 16:54:10.100073+00
0172366a-e03f-455b-af8b-e7dda97b69f0	test	0399746612	test@gmail.com	investor	test	pending	2026-01-04 16:58:54.963563+00	2026-01-04 16:58:54.963563+00
e973fb5e-d290-4955-aa25-7edf4c7bec2c	test	0399746612	test@gmail.com	investor	test	pending	2026-01-04 17:02:59.728666+00	2026-01-04 17:02:59.728666+00
73151a48-7592-41a7-a515-c7ccbf030e37	test	0399746612	test@gmail.com	investor	test	pending	2026-01-04 17:04:49.626965+00	2026-01-04 17:04:49.626965+00
\.


--
-- Data for Name: content_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_reports (id, reporter_id, content_type, content_id, reason, description, status, resolved_by, resolved_at, resolution_note, created_at) FROM stdin;
\.


--
-- Data for Name: credit_limits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_limits (id, business_id, customer_id, credit_limit, used_credit, default_term_days, default_interest_rate, default_late_fee_rate, is_active, approved_by, approved_at, risk_level, credit_score, notes, created_at, updated_at, bank) FROM stdin;
\.


--
-- Data for Name: financial_partners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.financial_partners (id, name, type, contact_person, phone, email, address, discount_rate, advance_rate, processing_fee, is_active, notes, metadata, created_at, updated_at) FROM stdin;
2c07b1c9-ce0a-4663-82f0-5a902f52621f	Ngân hàng Nông nghiệp & Phát triển Nông thôn	bank	\N	\N	\N	\N	2.50	80.00	0.50	t	Agribank - Hỗ trợ nông nghiệp	{}	2026-01-21 06:21:12.399213+00	2026-01-21 06:21:12.399213+00
efd36cfb-6486-4615-9fc9-fbb815f5f172	Ngân hàng TMCP Sài Gòn Thương Tín	bank	\N	\N	\N	\N	3.00	75.00	0.30	t	Sacombank	{}	2026-01-21 06:21:12.399213+00	2026-01-21 06:21:12.399213+00
ac775526-2d6c-48be-a069-426a5d2b0d00	VNPay	fintech	\N	\N	\N	\N	1.50	90.00	0.20	t	Cổng thanh toán điện tử	{}	2026-01-21 06:21:12.399213+00	2026-01-21 06:21:12.399213+00
5bd66875-a8ff-4ed1-97db-aa88302633f4	MoMo	fintech	\N	\N	\N	\N	1.80	85.00	0.25	t	Ví điện tử	{}	2026-01-21 06:21:12.399213+00	2026-01-21 06:21:12.399213+00
\.


--
-- Data for Name: investment_projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investment_projects (id, user_id, title, description, funding_goal, current_funding, farmers_impacted, area, status, image_url, start_date, end_date, created_at, updated_at, moderation_status, moderation_note, moderated_by, moderated_at) FROM stdin;
ede26cd1-eb56-4c6a-8d7c-005227237517	6c45203b-a5ff-4f1c-be40-6bce6188f757	MÔ HÌNH TRỮ NƯỚC NGỌT PHÂN TÁN KẾT HỢP CẢM BIẾN MẶN CHO NÔNG DÂN VÙNG VEN BIỂN ĐỒNG BẰNG SÔNG CỬU LONG	Dự án nhằm xây dựng mô hình trữ nước ngọt phân tán quy mô hộ và liên hộ, kết hợp hệ thống cảm biến đo độ mặn – mực nước – chất lượng nước theo thời gian thực, hỗ trợ nông dân vùng ven biển Đồng bằng sông Cửu Long chủ động ứng phó với xâm nhập mặn, hạn hán và biến đổi khí hậu.\n\nMô hình bao gồm các hợp phần chính: (1) xây dựng bể trữ nước ngọt, ao lót bạt và hệ thống dẫn nước linh hoạt; (2) lắp đặt cảm biến mặn và thiết bị giám sát từ xa; (3) ứng dụng di động cung cấp cảnh báo sớm xâm nhập mặn và khuyến nghị sử dụng nước hợp lý cho từng loại cây trồng, vật nuôi; (4) đào tạo nông dân vận hành và bảo trì hệ thống.\n\nDự án kỳ vọng giúp giảm thiểu rủi ro thiếu nước ngọt, ổn định sản xuất nông nghiệp, nâng cao thu nhập cho nông dân, đồng thời góp phần sử dụng bền vững tài nguyên nước và tăng khả năng chống chịu của hệ sinh thái nông nghiệp vùng ven biển ĐBSCL trước biến đổi khí hậu.	90000000000	90000000000	25000	Bạc Liêu	active	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/project-images/6c45203b-a5ff-4f1c-be40-6bce6188f757/1769297716748.png	2026-02-02 00:00:00+00	2031-02-02 00:00:00+00	2026-01-24 23:35:23.863684+00	2026-03-24 15:00:30.273227+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-25 01:35:57.585945+00
1631e8f0-dc84-455d-82b8-58f239532ea4	37f5ce8a-f218-4ec7-87d0-52967b78be4e	Hệ thống cống ngăn mặn XXX	Giảm thiểu ảnh hưởng do hạn mặn gây ra, hỗ trợ cấp nước ngọt ứng phó với các đợt mặn lên cao trên sông Hậu cho diện tích tự nhiên 36.710ha thuộc các huyện Kế Sách, Châu Thành (tỉnh Sóc Trăng)	500000000000	500000000000	30000	Sóc Trăng	active	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/project-images/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768315307613.jpg	2026-01-13 00:00:00+00	2027-01-13 00:00:00+00	2026-01-13 14:41:50.269137+00	2026-01-21 07:41:16.107808+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-17 17:36:00.888677+00
4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	HỆ THỐNG ĐIỀU TIẾT NƯỚC VÀ KIỂM SOÁT XÂM NHẬP MẶN THÔNG MINH IOT	Xâm nhập mặn tại Đồng bằng Sông Cửu Long ngày càng diễn biến phức tạp, gây thiệt hại lớn cho sản xuất nông nghiệp.\nTrong khi các công trình cống ngăn mặn truyền thống có chi phí cao và thiếu tính linh hoạt, dự án này đề xuất một giải pháp điều tiết nước thông minh dựa trên dữ liệu thực tế và công nghệ số.\n\nDự án xây dựng hệ thống:\n\nCảm biến đo độ mặn, mực nước, chất lượng nước tại kênh rạch\n\nVan điều tiết nước quy mô nhỏ, phân tán\n\nNền tảng dữ liệu dự báo xâm nhập mặn theo ngày, tuần, tháng\n\nCảnh báo sớm cho nông dân qua điện thoại\n\nGiải pháp giúp nông dân:\n\nChủ động nguồn nước\n\nGiảm thiệt hại do mặn\n\nTối ưu mùa vụ và chi phí sản xuất\n\nTăng năng suất bền vững	100000000000	50200000000	18000	Bến Tre – Trà Vinh 	active	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/project-images/c3aa89c3-71b6-4c7e-9afe-e3ea7817a213/1768981956316.jpg	2026-02-01 00:00:00+00	2030-02-01 00:00:00+00	2026-01-21 07:52:37.460001+00	2026-03-30 05:42:03.324331+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 08:02:05.889074+00
46e5b8e5-d4ab-4488-b517-574c3ab7299d	2175a36f-c2d5-431a-9482-04d3bd25e53f	Hệ thống giám sát và điều tiết nước mặn – ngọt vùng ven biển ĐBSCL	Dự án triển khai hệ thống cảm biến đo độ mặn, mực nước và tự động đóng/mở cống điều tiết nước cho các khu vực trồng lúa và cây ăn trái tại vùng ven biển Đồng bằng Sông Cửu Long. Hệ thống giúp nông dân chủ động ứng phó với xâm nhập mặn, giảm thiệt hại mùa vụ và tăng năng suất từ 10–20%. Ngoài ra, dữ liệu được cập nhật theo thời gian thực lên nền tảng web giúp chính quyền và nông dân theo dõi dễ dàng.	3200000000	0	350	Bến Tre, Sóc Trăng, Trà Vinh	active	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/project-images/2175a36f-c2d5-431a-9482-04d3bd25e53f/1775129875111.webp	2026-06-01 00:00:00+00	2027-12-01 00:00:00+00	2026-04-02 11:37:56.49244+00	2026-04-02 11:37:56.49244+00	pending	\N	\N	\N
881a5ecb-15df-4a39-8fb9-535aca345973	2175a36f-c2d5-431a-9482-04d3bd25e53f	Sàn thương mại điện tử nông sản ĐBSCL kết nối trực tiếp nông dân	Dự án xây dựng nền tảng web/app giúp nông dân tại Đồng bằng Sông Cửu Long bán trực tiếp trái cây (xoài, sầu riêng, chôm chôm) và thủy sản (cá tra, tôm) đến người tiêu dùng và doanh nghiệp. Hệ thống tích hợp truy xuất nguồn gốc, thanh toán online và liên kết đơn vị vận chuyển lạnh. Giúp giảm phụ thuộc thương lái, tăng lợi nhuận cho nông dân từ 15–30%.	6000000000	0	800	Đồng Tháp, Cần Thơ, An Giang, Kiên Giang	active	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/project-images/2175a36f-c2d5-431a-9482-04d3bd25e53f/1775130175676.jpg	2026-07-15 00:00:00+00	2028-07-15 00:00:00+00	2026-04-02 11:42:57.640886+00	2026-04-02 11:42:57.640886+00	pending	\N	\N	\N
40ee36f4-2d29-4361-9d04-9567fc138e78	300bd426-4394-4f3d-9691-38c40b380222	Hệ thống Canh Tác tích hợp Cảm biến EU	Rất hợp với vùng sông nước nhiễm mặn cao của chúng ta	100000000	0	390000	Bến Tre, Cần Thơ	active	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/project-images/300bd426-4394-4f3d-9691-38c40b380222/1775130226811.jpg	2025-02-04 00:00:00+00	2032-02-04 00:00:00+00	2026-04-02 11:43:53.533586+00	2026-04-02 11:43:53.533586+00	pending	\N	\N	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, link, actor_id, actor_username, actor_avatar, is_read, created_at) FROM stdin;
a396bb8c-0614-49e7-ad82-de51bd1d1176	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	nguyentankhiem11	\N	f	2026-01-23 01:23:21.321117+00
aa09740a-923e-462c-8c5b-a77a22f3686b	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	t	2026-01-16 11:25:07.792341+00
13439dc2-b79e-4bae-aad9-ab179455af41	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	02f10e79-87fe-4842-8790-97976769f4fa	test_2025	\N	t	2026-01-16 11:27:05.359156+00
68bd5668-f9d7-480c-8831-a6449c0f573c	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-03-12 09:26:21.583455+00
bdceabc5-f47e-4a8d-b850-a9ed0fda8688	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	6c45203b-a5ff-4f1c-be40-6bce6188f757	nguyenvanb	\N	f	2026-01-16 09:07:20.735587+00
ae39df36-ec25-46f0-bdfc-1f277afaae95	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	nguyen_anh_linh	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209/1768547053424.jpg	f	2026-01-16 09:45:21.162318+00
7d3e7385-c014-4add-9c81-21c1c21ee63b	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	4e9dd36c-38f2-4353-a320-0c31fa3cc970	nguyentankhiem123	\N	f	2026-03-24 14:55:55.788995+00
054d65da-58e5-4dd9-8846-a8974051df21	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-01-16 11:25:03.803936+00
78647126-f568-4a5f-a55a-56555411d065	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-01-16 11:25:05.23566+00
86998bd0-1c67-48ba-8689-89f767b67483	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	2ce59d73-d507-4df2-8254-b780773e6465	idss_ueh_tsnmt	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/2ce59d73-d507-4df2-8254-b780773e6465/1778554707853.png	f	2026-05-12 03:17:41.937535+00
6cde1739-8b3c-4b10-983e-c2842dca9922	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	2ce59d73-d507-4df2-8254-b780773e6465	idss_ueh_tsnmt	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/2ce59d73-d507-4df2-8254-b780773e6465/1778554707853.png	f	2026-06-07 15:44:30.024365+00
541279ef-8c62-437f-a37d-69c29622e91d	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	02f10e79-87fe-4842-8790-97976769f4fa	test_2025	\N	f	2026-01-16 11:27:01.666572+00
76c4d1e9-372d-4e2e-89e3-8fe8de8eee82	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	02f10e79-87fe-4842-8790-97976769f4fa	test_2025	\N	f	2026-01-16 11:27:02.887857+00
65c01fde-ab53-415d-afe0-0ebbcbe69236	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	02f10e79-87fe-4842-8790-97976769f4fa	test_2025	\N	t	2026-01-16 11:26:59.924687+00
84a69f80-2cb0-4d4b-8a5d-a32160647e76	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	nguyen_anh_linh	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209/1768547053424.jpg	f	2026-01-17 01:16:24.888593+00
ba18c443-2b8f-4841-b1e1-52fe5b7e5943	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	t	2026-01-16 11:25:01.341717+00
0981f1ef-6217-4cda-b821-318cc60d16f1	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	anhtuan	\N	f	2026-01-17 11:25:43.381201+00
59a4910b-0317-44fd-9aec-7bfcb4c38a7f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	anhtuan	\N	f	2026-01-17 11:25:44.775827+00
63d55434-3086-4fa1-9257-c9c8550d8806	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	anhtuan	\N	f	2026-01-17 11:25:47.015537+00
2b12d5da-b22b-475b-a651-59a8b941c16b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	anhtuan	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/11c5a34a-a000-45e4-a301-09a98be93ba0/1768672150383.jpeg	f	2026-01-17 17:52:16.164515+00
a73e7ecc-90d6-432f-815b-5c097beb83a7	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	anhtuan	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/11c5a34a-a000-45e4-a301-09a98be93ba0/1768672150383.jpeg	f	2026-01-17 17:52:24.093682+00
b5b6d935-537a-4b8e-9900-10ce61949d4d	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	11c5a34a-a000-45e4-a301-09a98be93ba0	anhtuan	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/11c5a34a-a000-45e4-a301-09a98be93ba0/1768672150383.jpeg	f	2026-01-18 04:22:12.384611+00
7177b200-ea2e-4bd2-946a-80f3e1af6654	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	11c5a34a-a000-45e4-a301-09a98be93ba0	anhtuan	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/11c5a34a-a000-45e4-a301-09a98be93ba0/1768672150383.jpeg	t	2026-01-17 17:52:10.556854+00
210d4d57-b6ef-4c7d-bbea-c7c27cadb958	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-01-23 10:10:53.141135+00
d72b2330-7874-4c7e-a230-8f1fb8ae189b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 11:51:01.849148+00
d42311c1-511b-4053-b481-97eff61a5f20	becff985-c6d5-4413-8bc9-4ef86fa5ac52	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "test"	/posts/260cbf89-ff39-4a2d-8250-dbb593547c3f	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 11:59:51.761576+00
5ea6c11e-e6f2-4313-af8c-33cf7ca2ae78	d7b8b6cd-75cf-4324-b3ce-975a95849477	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "hack"	/posts/b85b3185-f499-431f-bbdf-40ae298a47e0	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 12:00:06.493897+00
4da345f3-3635-4f86-b8dc-0b093faed204	6c836d7e-cf23-4001-bf1f-e9b6ee09de2d	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "jack"	/posts/954d5c9c-9e82-402e-82a7-152e56303e43	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 12:00:32.807224+00
86d6edc1-e259-45a4-86ce-ab49aedc176f	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 12:01:09.759637+00
4eb00f9d-d35c-4141-a52d-848c374cdc0d	1993de5f-2df4-4232-bdaf-96681211700f	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "test"	/posts/8a2ae4b7-3e76-48f1-9cca-260a0a58fe44	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 12:02:15.202846+00
574ac542-bfe7-4060-acbe-106446ea3abe	1993de5f-2df4-4232-bdaf-96681211700f	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "test"	/posts/8a2ae4b7-3e76-48f1-9cca-260a0a58fe44	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 12:02:17.495452+00
165ce314-4d32-47e5-a509-86cf13c5ffb3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 12:03:39.266671+00
a6ac5106-b7ff-47b2-9d37-81ad539ff21d	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	f	2026-01-18 12:04:14.800396+00
3cc7fade-5804-43b0-9397-55aff7c26fd6	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	t	2026-01-18 12:07:03.591802+00
d5a3294b-97a4-4784-801f-9af79cf6f87c	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	\N	t	2026-01-18 12:07:06.428579+00
926119ee-e664-43b1-9df6-8a34d44578ec	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	4e9dd36c-38f2-4353-a320-0c31fa3cc970	nguyentankhiem123	\N	f	2026-03-24 14:56:25.098901+00
f24c0f6c-5071-444f-a137-5cf821317db3	becff985-c6d5-4413-8bc9-4ef86fa5ac52	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "oke"	/posts/4850c8ac-9d0f-4c72-8855-82b3d362a4c1	e977b62e-005f-4c17-9384-1f9a6283ca02	quangtmdt	\N	f	2026-01-19 16:09:32.039999+00
98aa4ad6-d370-4f9d-8fc9-fe913ad72bed	becff985-c6d5-4413-8bc9-4ef86fa5ac52	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "oke"	/posts/4850c8ac-9d0f-4c72-8855-82b3d362a4c1	e977b62e-005f-4c17-9384-1f9a6283ca02	quangtmdt	\N	f	2026-01-19 16:09:33.689198+00
61e01db0-0fbe-457e-8b62-3d8b7a808f17	becff985-c6d5-4413-8bc9-4ef86fa5ac52	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "oke"	/posts/4850c8ac-9d0f-4c72-8855-82b3d362a4c1	e977b62e-005f-4c17-9384-1f9a6283ca02	quangtmdt	\N	f	2026-01-19 16:09:45.352914+00
c0c257f8-6caa-4ad9-9c60-2fb657f9587f	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	2ce59d73-d507-4df2-8254-b780773e6465	idss_ueh_tsnmt	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/2ce59d73-d507-4df2-8254-b780773e6465/1778554707853.png	f	2026-05-12 03:17:45.208855+00
e2680126-826a-41f4-b1f6-a3d346e746b6	becff985-c6d5-4413-8bc9-4ef86fa5ac52	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "test"	/posts/260cbf89-ff39-4a2d-8250-dbb593547c3f	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:13:45.131337+00
304054e2-c486-4cb5-8b23-93ca02057d96	dd5e2f80-2fb3-45ac-9e38-b7a054f820cd	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "leader"	/posts/17628ef2-1c24-4c1b-b311-f248e3e1fa8f	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:13:45.175565+00
faf42560-5847-4319-849b-ec32cb1eae0c	9ce9ba21-e14e-45b9-b634-72c14b65f1ec	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "oke"	/posts/65fedb77-6c5d-4928-8288-391c118a98dd	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:13:46.009978+00
b06f0367-90f1-44de-a0f1-c889d7d6f0ff	9ce9ba21-e14e-45b9-b634-72c14b65f1ec	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "oke"	/posts/65fedb77-6c5d-4928-8288-391c118a98dd	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:13:49.051326+00
a48e6d01-6cdd-426d-ad21-30eaf67ac703	df685ac0-6065-4547-80f1-71997bc5684e	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "univ"	/posts/dbdf1358-22d8-4ba9-8c5b-42d023ada69e	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:13:51.559432+00
083ba266-c696-4c59-9300-7d31b8fb9dff	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:14:23.054313+00
40409337-f4b6-495b-bea0-a116861c3b99	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:15:14.322032+00
3992fad0-2c68-42c8-9320-cbb93423c946	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:15:44.953042+00
cc74f807-7c49-45ed-93bf-03096dde29a5	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:15:58.639567+00
a3a17e47-02bd-4e59-9323-f59f601c7740	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	2026-01-20 06:16:01.152234+00
f30d8b2b-8c25-42cf-b95d-714f431d83f5	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-01-23 10:10:55.726955+00
6a3dc340-a163-4c63-85e1-55f0fff345b6	6c45203b-a5ff-4f1c-be40-6bce6188f757	PROJECT_INVESTMENT	Đầu tư mới	đã đầu tư vào dự án: "MÔ HÌNH TRỮ NƯỚC NGỌT PHÂN TÁN KẾT HỢP CẢM BIẾN MẶ"	/invest/ede26cd1-eb56-4c6a-8d7c-005227237517	4e9dd36c-38f2-4353-a320-0c31fa3cc970	nguyentankhiem123	\N	f	2026-03-24 15:00:30.273227+00
c46be14a-13d3-43ff-941d-96e56cb68516	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	2ce59d73-d507-4df2-8254-b780773e6465	idss_ueh_tsnmt	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/2ce59d73-d507-4df2-8254-b780773e6465/1778554707853.png	f	2026-06-07 15:44:32.613069+00
ef1938a2-bf90-4b2a-ba25-b6bac3528844	76fb9807-6735-478f-a363-79fb2a20be7f	POST_APPROVED	Bài viết đã được phê duyệt	Bài viết "test_duyệt" của bạn đã được Admin phê duyệt và hiển thị công khai.	/posts	\N	\N	\N	f	2026-01-21 04:57:17.45262+00
9989bd54-a00e-4dee-b422-b888424a37eb	d4e15dfe-84c9-489a-997f-4303eb9de453	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "test" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-21 06:42:50.325848+00
e5bd8770-2b9a-4006-a774-e754bddb2d1c	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	17bdad1d-532c-4a07-9936-669d62c8ef04	phanvanbai	\N	f	2026-01-21 06:44:12.519123+00
893ecf9d-cc51-4848-a490-90fc5683a110	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e977b62e-005f-4c17-9384-1f9a6283ca02	quangtmdt	\N	f	2026-01-21 06:54:52.972295+00
42af56f6-7330-4d3b-9156-4f1eedf9fceb	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e977b62e-005f-4c17-9384-1f9a6283ca02	quangtmdt	\N	f	2026-01-21 06:54:55.272258+00
2b881ecb-80c5-44ac-96b6-bb1c40a3f75d	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_APPROVED	Bài viết đã được phê duyệt	Bài viết "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói cho nông dân khiếm thị Đồng bằng Sông Cửu Long" của bạn đã được Admin phê duyệt và hiển thị công khai.	/posts	\N	\N	\N	t	2026-01-21 07:03:49.141056+00
1257285e-9dc5-48d6-9301-6aa7a339bcd5	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_APPROVED	Bài viết đã được phê duyệt	Bài viết "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG VỤ THÀNH CÔNG" của bạn đã được Admin phê duyệt và hiển thị công khai.	/posts	\N	\N	\N	f	2026-01-21 07:14:41.521823+00
f39cbbfc-029a-416a-a0dd-69371e0df85b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e977b62e-005f-4c17-9384-1f9a6283ca02	quangtmdt	\N	f	2026-01-21 07:15:20.491797+00
366ef8b5-4163-4fbe-a961-d42b4d32e679	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	06558882-7a10-4b69-b8e0-4fef2684a434	tranthisinh	\N	f	2026-01-21 07:16:58.440054+00
4f645270-6abc-412d-9a0f-5e2dcda1c280	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	06558882-7a10-4b69-b8e0-4fef2684a434	tranthisinh	\N	f	2026-01-21 07:17:00.392109+00
dc6e9a42-9c93-4ada-acbc-3d086647a539	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	06558882-7a10-4b69-b8e0-4fef2684a434	tranthisinh	\N	f	2026-01-21 07:18:08.319375+00
0c36eb8e-7737-40da-bb61-7b3ab376121e	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	06558882-7a10-4b69-b8e0-4fef2684a434	tranthisinh	\N	f	2026-01-21 07:27:43.615039+00
372487f7-ce90-428e-b432-89b87595b290	06558882-7a10-4b69-b8e0-4fef2684a434	POST_APPROVED	Bài viết đã được phê duyệt	Bài viết "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TIẾT THẤT THƯỜNG , XÂM NHẬP MẶN NGÀY CÀNG TĂNG" của bạn đã được Admin phê duyệt và hiển thị công khai.	/posts	\N	\N	\N	f	2026-01-21 07:49:26.726385+00
742efe18-f8ce-4e05-93cf-d77163d55284	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:53:44.150893+00
1e31edd0-f0ed-46c1-8a32-3f79c6aa316e	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:53:46.279376+00
f6f189b0-d84f-43ec-8014-dbb8b52c8eee	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:53:48.55107+00
952bc44a-fc19-4dcb-a607-b232f3cfb715	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:53:51.516791+00
f2fab4a9-d5e3-4802-a563-22010f9a50bf	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:53:53.236934+00
d0ec7dca-60f0-4766-9494-5e4deb998a89	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:53:54.845386+00
2663ce0a-328a-4ea4-a9e4-51ad7797c608	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:54:15.042898+00
420139ce-c5f0-43e2-9a0a-4fb2d4a9abbe	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:54:22.281337+00
9444242d-6d3b-4e62-ac00-de3effa7033c	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-01-23 10:10:57.550948+00
6f337829-fa23-435c-b646-589a08f71c5f	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:55:33.391519+00
62ace415-5f84-4adb-873c-45a26b035378	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	t	2026-01-21 07:54:24.172845+00
8fb9800f-221c-4187-852e-2c798e63f5d9	6c45203b-a5ff-4f1c-be40-6bce6188f757	PROJECT_RATING	Đánh giá dự án	đã đánh giá 5 sao cho dự án: "MÔ HÌNH TRỮ NƯỚC NGỌT PHÂN TÁN KẾT HỢP C"	/invest/ede26cd1-eb56-4c6a-8d7c-005227237517	4e9dd36c-38f2-4353-a320-0c31fa3cc970	nguyentankhiem123	\N	f	2026-03-24 15:01:53.970048+00
8ee0688d-a2e0-42cd-a497-2e41386b0641	2175a36f-c2d5-431a-9482-04d3bd25e53f	POST_APPROVED	Bài viết đã được phê duyệt	Bài viết "Giải pháp sử dụng cảm biến đo mặn để chủ động lấy nước tại ĐBSCL" của bạn đã được Admin phê duyệt và hiển thị công khai.	/posts	\N	\N	\N	f	2026-06-09 15:25:00.745961+00
f2758c61-0c9a-4eab-8063-bd60fdcb4601	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	20585b2e-27e7-42c3-87bb-3ddebb856a7d	btc_celg	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/20585b2e-27e7-42c3-87bb-3ddebb856a7d/1781448585224.jpeg	f	2026-08-07 13:24:51.354811+00
fbc60bef-b5de-4110-9c4d-f05d86a21197	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	\N	f	2026-01-21 07:54:52.599551+00
43bf1a7c-56c0-4dd7-ba8d-812667e0489f	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	PROJECT_APPROVED	Dự án đầu tư đã được phê duyệt	Dự án "HỆ THỐNG ĐIỀU TIẾT NƯỚC VÀ KIỂM SOÁT XÂM NHẬP MẶN THÔNG MINH IOT" của bạn đã được Admin phê duyệt và sẵn sàng nhận đầu tư.	/invest	\N	\N	\N	f	2026-01-21 08:02:06.124926+00
53610c8e-1711-450b-aa50-3806efcd8bdf	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_APPROVED	Bài viết đã được phê duyệt	Bài viết "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng)" của bạn đã được Admin phê duyệt và hiển thị công khai.	/posts	\N	\N	\N	f	2026-01-21 09:01:07.419224+00
9aa6bdf2-a0af-4d5b-8881-aa174af25551	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-01-23 10:11:00.424515+00
02dac1de-a3d6-4e26-9cbd-810bfb54930f	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	nguyenthilanh	\N	f	2026-01-21 09:03:37.371081+00
a1499660-2a60-4a03-8d87-eb833780488c	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	nguyenthilanh	\N	f	2026-01-21 09:03:40.563395+00
921af6cc-da52-4774-9db2-3b5761a9ec58	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	nguyenthilanh	\N	f	2026-01-21 09:03:43.169465+00
b01e88cc-c9f5-48a8-abbd-baa5b76b574d	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	nguyenthilanh	\N	f	2026-01-21 09:03:45.241994+00
c400dccb-f89e-4abc-a8de-b79d3a3ba103	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	nguyenthilanh	\N	f	2026-01-21 09:04:05.418905+00
2427474d-b053-4bee-a027-b0d24a88ab43	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	9f377073-462e-4308-a72c-f1a6ccbea515	truongdinhchieu	\N	f	2026-01-21 09:05:35.134682+00
7a4eb443-feb0-486e-99bf-39dff74aad62	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	9f377073-462e-4308-a72c-f1a6ccbea515	truongdinhchieu	\N	f	2026-01-21 09:05:46.387955+00
61374d19-dee8-4280-acee-cb6d8d4191e8	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	9f377073-462e-4308-a72c-f1a6ccbea515	truongdinhchieu	\N	f	2026-01-21 09:05:49.01831+00
afba4469-f0ee-4d3e-9631-ac5b1e54ac50	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	9f377073-462e-4308-a72c-f1a6ccbea515	truongdinhchieu	\N	f	2026-01-21 09:05:51.424193+00
1a81b64f-317c-472c-a6b8-503fe85d16ec	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9f377073-462e-4308-a72c-f1a6ccbea515	truongdinhchieu	\N	f	2026-01-21 09:05:54.070336+00
ea71a7f3-c7ca-4c38-9629-152984b21b58	4e9dd36c-38f2-4353-a320-0c31fa3cc970	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/9d0ef483-3495-446e-a744-f290c1e4d509	9d0ef483-3495-446e-a744-f290c1e4d509	tankhiem123	\N	f	2026-03-25 10:45:30.877105+00
7c4412c3-e776-40a6-811e-512a1f6a57ea	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	36597eb2-1818-4c3f-b98e-6ba968c77dc4	nguyenvancuong	\N	f	2026-01-21 09:06:52.612237+00
6d54a2d8-b936-47fa-8475-5c91f2a3ad7f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	36597eb2-1818-4c3f-b98e-6ba968c77dc4	nguyenvancuong	\N	f	2026-01-21 09:06:54.105584+00
eac58ef5-f134-4b02-b91d-31caaac277ca	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/5d100834-5494-4217-ac7c-e02053c4f016/1781410733258.jpeg	f	2026-06-14 07:22:42.50549+00
26c077ed-f330-4365-8b8a-fc6186e9acb6	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	36597eb2-1818-4c3f-b98e-6ba968c77dc4	nguyenvancuong	\N	f	2026-01-21 09:07:04.756487+00
b731a2fc-666a-4b4f-964a-25f9a8cce847	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	c43b8800-64e8-4207-a797-6e432afc37d2	phanlychi	\N	f	2026-01-21 09:12:05.622277+00
2fa2b147-6662-481a-a189-1501544b4af7	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c43b8800-64e8-4207-a797-6e432afc37d2	phanlychi	\N	f	2026-01-21 09:12:08.190398+00
9ee4de32-c8df-455c-9e57-26548647109b	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	c43b8800-64e8-4207-a797-6e432afc37d2	phanlychi	\N	f	2026-01-21 09:12:11.181861+00
6453334e-60f7-4ea5-a69c-3f48fa67f4ac	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	c43b8800-64e8-4207-a797-6e432afc37d2	phanlychi	\N	f	2026-01-21 09:12:12.923854+00
cbba89dd-fe56-4777-b868-95dc3ec9d568	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c43b8800-64e8-4207-a797-6e432afc37d2	phanlychi	\N	f	2026-01-21 09:12:15.588664+00
3f660922-f021-48fb-a406-e74f71cb2326	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c43b8800-64e8-4207-a797-6e432afc37d2	phanlychi	\N	f	2026-01-21 09:12:17.485007+00
ba890582-93dc-451c-bfd6-f42ceec0ffd9	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	a359520f-7b6e-4aff-9265-bb33afa669f5	nguyendantruong	\N	f	2026-01-21 09:14:16.681702+00
149f9e86-121a-4127-8a45-7103f8b131e8	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	a359520f-7b6e-4aff-9265-bb33afa669f5	nguyendantruong	\N	f	2026-01-21 09:14:17.988496+00
35a76a8c-879e-4cb0-b1a6-dbdb39c6b998	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-01-23 10:11:02.213861+00
5a3393dc-3d5b-48ea-9227-0efabf34fb3c	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	PROJECT_INVESTMENT	Đầu tư mới	đã đầu tư vào dự án: "HỆ THỐNG ĐIỀU TIẾT NƯỚC VÀ KIỂM SOÁT XÂM NHẬP MẶN "	/invest/4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	9d0ef483-3495-446e-a744-f290c1e4d509	tankhiem123	\N	f	2026-03-25 10:46:45.155337+00
a151e5f3-50ee-4b7c-b3eb-9330506c5072	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	a359520f-7b6e-4aff-9265-bb33afa669f5	nguyendantruong	\N	f	2026-01-21 09:14:31.230083+00
0f50b868-dddb-429a-ac81-2c33052b9954	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	a359520f-7b6e-4aff-9265-bb33afa669f5	nguyendantruong	\N	f	2026-01-21 09:14:44.00196+00
59732bca-54ed-414c-9c3f-e8027746f8d8	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	\N	f	2026-01-21 09:16:22.978646+00
20383701-9549-4b97-8916-7dd906ad7721	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	\N	f	2026-01-21 09:16:26.292539+00
a56edc67-16fa-4440-96ab-26959dbf279e	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/5d100834-5494-4217-ac7c-e02053c4f016/1781410733258.jpeg	f	2026-06-14 07:22:43.81127+00
5faad168-af88-4a1a-910e-4185f78c6ce1	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	20585b2e-27e7-42c3-87bb-3ddebb856a7d	btc_celg	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/20585b2e-27e7-42c3-87bb-3ddebb856a7d/1781448585224.jpeg	f	2026-08-07 13:24:56.615645+00
85c1bcb7-c052-4d42-934f-0c23b26fb699	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	a359520f-7b6e-4aff-9265-bb33afa669f5	nguyendantruong	\N	f	2026-01-21 09:14:35.036105+00
16886c0a-ccfd-46f7-8bf8-2e0ede2d2e28	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	a359520f-7b6e-4aff-9265-bb33afa669f5	nguyendantruong	\N	f	2026-01-21 09:14:37.243164+00
51105802-d9dd-4e92-88e2-5d1209096d9b	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	PROJECT_INVESTMENT	Đầu tư mới	đã đầu tư vào dự án: "HỆ THỐNG ĐIỀU TIẾT NƯỚC VÀ KIỂM SOÁT XÂM NHẬP MẶN "	/invest/4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	ca24214f-9f3f-40f2-8c59-900f3124c5c8	nab	\N	f	2026-01-23 15:28:10.221277+00
c518b268-cb3f-4afa-aaf7-0e9c7a8c64cc	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	\N	f	2026-01-21 09:16:18.349733+00
dd0508f4-4ce4-4de8-b165-97fffe77328d	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	PROJECT_RATING	Đánh giá dự án	đã đánh giá 5 sao cho dự án: "HỆ THỐNG ĐIỀU TIẾT NƯỚC VÀ KIỂM SOÁT XÂM"	/invest/4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	9d0ef483-3495-446e-a744-f290c1e4d509	tankhiem123	\N	f	2026-03-25 10:47:04.018211+00
75f72c4b-ef9b-4793-9e6d-9453654c2fa8	2175a36f-c2d5-431a-9482-04d3bd25e53f	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp sử dụng cảm biến đo mặn để chủ động lấy "	/posts/dad214d1-eab3-4cb9-b3a9-45de14b2e778	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/5d100834-5494-4217-ac7c-e02053c4f016/1781410733258.jpeg	f	2026-06-14 07:22:45.315367+00
a8eb5666-d16a-4421-ac82-713563196aec	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	a359520f-7b6e-4aff-9265-bb33afa669f5	nguyendantruong	\N	f	2026-01-21 09:14:41.733951+00
ed51fbdd-6fe8-465b-a233-ad5dbefee978	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	\N	f	2026-01-21 09:15:59.863719+00
43badeb7-ce34-4ac5-85de-ead6bf3548fc	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	PROJECT_INVESTMENT	Đầu tư mới	đã đầu tư vào dự án: "HỆ THỐNG ĐIỀU TIẾT NƯỚC VÀ KIỂM SOÁT XÂM NHẬP MẶN "	/invest/4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	17bdad1d-532c-4a07-9936-669d62c8ef04	phanvanbai	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/17bdad1d-532c-4a07-9936-669d62c8ef04/1769110094918.jpeg	f	2026-01-24 02:13:24.578292+00
e7325f10-9db2-4ef0-ae2d-75b714276fbb	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	2374dd2e-e380-45d4-a350-bedbaae40ad0	nhatnam	\N	f	2026-03-25 19:01:54.202439+00
008e143f-86ec-4f3c-835e-a8a7bd95dfe3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/5d100834-5494-4217-ac7c-e02053c4f016/1781410733258.jpeg	f	2026-06-14 07:27:32.518903+00
89068fa3-83f5-438f-bfc5-5a9721863a2e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	\N	f	2026-01-21 09:15:57.877104+00
630eb39c-26d4-40d4-ae95-ecab7b73bd20	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	\N	f	2026-01-21 09:16:13.651793+00
b60001da-4c91-4543-904f-c857ec5538ab	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	\N	f	2026-01-21 09:16:20.507905+00
d8e576e0-fad0-4447-9785-87fb5767bb6f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	a49342a7-3158-433b-a256-172b68d1de57	lyhaonhien	\N	f	2026-01-21 09:21:50.443093+00
1c8cfe65-f855-4a3f-8abe-f51bcbb7a475	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	a49342a7-3158-433b-a256-172b68d1de57	lyhaonhien	\N	f	2026-01-21 09:23:30.449276+00
262d5de8-1e61-4a88-9dd7-ed40e879280d	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/a49342a7-3158-433b-a256-172b68d1de57	a49342a7-3158-433b-a256-172b68d1de57	lyhaonhien	\N	f	2026-01-21 09:23:39.790148+00
3381bfbb-826b-4a74-aa60-eaf9eb67fe60	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/a49342a7-3158-433b-a256-172b68d1de57	a49342a7-3158-433b-a256-172b68d1de57	lyhaonhien	\N	f	2026-01-21 09:23:46.639849+00
658eeb6b-f603-4b3a-b8f8-587c2d22d4bc	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/a49342a7-3158-433b-a256-172b68d1de57	a49342a7-3158-433b-a256-172b68d1de57	lyhaonhien	\N	f	2026-01-21 09:23:50.638933+00
1a8df213-2e7b-49af-ae0a-f6387f9e9fa3	ca24214f-9f3f-40f2-8c59-900f3124c5c8	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "Máy đo độ mặn" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-24 03:30:12.277274+00
14a53385-260c-492e-84b2-402f19d1e981	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	\N	f	2026-01-21 09:27:04.010343+00
bc998be0-6f40-46f7-bf8a-8143031621c8	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	\N	f	2026-01-21 09:27:06.492196+00
09d0d522-2e14-41ba-a5c3-4aa2f7847f6a	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	\N	f	2026-01-21 09:27:09.080549+00
363de2ab-f824-4840-96ac-d51e14cd376a	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	\N	f	2026-01-21 09:27:10.83216+00
e2f168a6-e4df-41b5-a791-3f4f644b35db	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	\N	f	2026-01-21 09:27:12.72585+00
1853650e-c9ae-43b2-9647-b86c215dfd24	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	\N	f	2026-01-21 09:27:14.613112+00
ef5ed319-6dde-41d0-a1c3-1e91715d8820	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	\N	f	2026-01-21 09:27:15.927982+00
5b8e71fd-6905-417a-a872-05cc3dfec693	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	\N	f	2026-01-21 09:27:18.098166+00
21f05050-de49-4651-8439-47753a40af8c	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	\N	t	2026-01-21 09:15:54.713552+00
1bd10f10-8f5a-48d3-8d96-ab5eb0a2db71	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e66c8ff2-f269-4bf0-8d22-58731ba77517	phanvangiang	\N	f	2026-01-21 09:30:56.32271+00
c57b6a90-c775-4dbc-96da-838b331cdf44	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e66c8ff2-f269-4bf0-8d22-58731ba77517	phanvangiang	\N	f	2026-01-21 09:30:58.650847+00
8b6f8d67-2ac7-49c0-af06-84ab4f85f614	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	e66c8ff2-f269-4bf0-8d22-58731ba77517	phanvangiang	\N	f	2026-01-21 09:31:01.527627+00
3413ee7d-5466-4257-bd23-cf8abcd71408	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	2374dd2e-e380-45d4-a350-bedbaae40ad0	nhatnam	\N	f	2026-03-25 19:02:00.015348+00
c6c5cc90-2333-4879-b5dd-bb6f170c93bb	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e66c8ff2-f269-4bf0-8d22-58731ba77517	phanvangiang	\N	f	2026-01-21 09:31:10.042976+00
232992cd-4878-446f-be18-a08f6dccb253	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	e66c8ff2-f269-4bf0-8d22-58731ba77517	phanvangiang	\N	f	2026-01-21 09:31:42.75173+00
b2ace41d-2419-4efc-ae19-df588452c4df	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	phanvannam	\N	f	2026-01-21 09:33:13.187208+00
45418283-1cbe-4032-9bfb-d54f3878cfb7	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	phanvannam	\N	f	2026-01-21 09:33:16.653901+00
4e9d5876-43a9-4426-bea0-401ae0636ca1	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	phanvannam	\N	f	2026-01-21 09:33:20.866781+00
2d0ba708-dc0a-4dfb-8e1f-6488ed4c2020	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	phanvannam	\N	f	2026-01-21 09:33:21.77334+00
a4fa09e2-fb60-4120-b8eb-e436f9f456b9	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/5d100834-5494-4217-ac7c-e02053c4f016/1781410733258.jpeg	f	2026-06-14 07:29:09.662237+00
2afc57b0-a190-4bee-b02d-0e05fb1e0b01	ca24214f-9f3f-40f2-8c59-900f3124c5c8	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "Máy đo" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-24 03:30:15.44929+00
826f9d60-06a3-4337-a806-da69af6528d1	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	phanvannam	\N	f	2026-01-21 09:34:31.558487+00
a3128953-8a05-4a58-b52e-e7fbb393bd06	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	phanhaonhien	\N	f	2026-01-21 09:35:26.72772+00
812bfb83-e44f-4849-a2a8-75f47b9bbc58	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	phanhaonhien	\N	f	2026-01-21 09:35:28.160843+00
89d3ce31-c34f-447c-b680-831271e45d66	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	phanhaonhien	\N	f	2026-01-21 09:35:30.908721+00
f9c27d20-f633-44f6-bf13-431c32ddba74	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	phanhaonhien	\N	f	2026-01-21 09:35:32.566685+00
d2235ca5-3089-4464-b8a7-d93fb02359c3	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	2374dd2e-e380-45d4-a350-bedbaae40ad0	nhatnam	\N	f	2026-03-25 19:02:02.980193+00
c5caaa62-dd42-4f13-b3a2-6d59455e79df	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	phanhaonhien	\N	f	2026-01-21 09:35:51.354731+00
15e1f9d1-289f-41bb-9c45-e18729bd9268	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	de671e87-8ed3-480f-a6af-d7707a4b75c9	nongbinhbac	\N	f	2026-01-21 09:36:48.30331+00
ec081d01-e9e3-437a-866a-5f41d6321d3f	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	de671e87-8ed3-480f-a6af-d7707a4b75c9	nongbinhbac	\N	f	2026-01-21 09:36:50.430716+00
4b2b3de7-326f-426e-932c-5b4d5fd54135	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	de671e87-8ed3-480f-a6af-d7707a4b75c9	nongbinhbac	\N	f	2026-01-21 09:36:52.819296+00
3f0e1d05-e6e6-4834-a568-0645b2b5a6bc	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	de671e87-8ed3-480f-a6af-d7707a4b75c9	nongbinhbac	\N	f	2026-01-21 09:36:54.496603+00
884bcef6-0489-48d5-8837-84c3fe68bba8	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	de671e87-8ed3-480f-a6af-d7707a4b75c9	nongbinhbac	\N	f	2026-01-21 09:36:56.71964+00
b3839d95-a7ad-4aa5-afb4-31770c7bbdd9	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	de671e87-8ed3-480f-a6af-d7707a4b75c9	nongbinhbac	\N	f	2026-01-21 09:37:44.952241+00
8e5046df-df19-49e3-8b32-9f3f1b14ab4b	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	535c19e9-df3b-46c1-95dc-f93cb3f22afe	phamthanhthao	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/535c19e9-df3b-46c1-95dc-f93cb3f22afe/1768988441148.jpg	f	2026-01-21 09:40:53.456425+00
95626707-112a-4df7-932a-4ef70d9148a7	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	535c19e9-df3b-46c1-95dc-f93cb3f22afe	phamthanhthao	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/535c19e9-df3b-46c1-95dc-f93cb3f22afe/1768988441148.jpg	f	2026-01-21 09:41:00.281519+00
913003bc-98a4-4826-b63a-85a3d3fe2e81	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	535c19e9-df3b-46c1-95dc-f93cb3f22afe	phamthanhthao	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/535c19e9-df3b-46c1-95dc-f93cb3f22afe/1768988441148.jpg	f	2026-01-21 09:41:07.404558+00
edf107b0-8677-415a-bf16-2b7d57d079bd	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	535c19e9-df3b-46c1-95dc-f93cb3f22afe	phamthanhthao	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/535c19e9-df3b-46c1-95dc-f93cb3f22afe/1768988441148.jpg	f	2026-01-21 09:42:14.144154+00
d418ba12-1cf4-41a2-95bf-877864b9fb37	d4e15dfe-84c9-489a-997f-4303eb9de453	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "test" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-21 09:43:15.893939+00
3b69aeb2-d414-4040-ad44-541d0e506171	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b7215524-a4d6-4661-a7c3-83643d53bc8d	phanvancu	\N	f	2026-01-21 09:44:55.417677+00
5d613882-bba8-4435-bef9-d82dce4012fc	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b7215524-a4d6-4661-a7c3-83643d53bc8d	phanvancu	\N	f	2026-01-21 09:44:56.857823+00
d2dba280-86f5-4f16-b2c4-42ec255ea079	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b7215524-a4d6-4661-a7c3-83643d53bc8d	phanvancu	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/b7215524-a4d6-4661-a7c3-83643d53bc8d/1768988885549.jpg	f	2026-01-21 09:49:44.397064+00
74b0b82d-c372-4e3f-8f9c-9efbd2e3c41f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8c016324-b2b4-42b8-a89f-a46687f7e589	ngu	\N	f	2026-01-21 09:53:07.2456+00
afe5b4ea-279e-49ed-ab8e-2cc805def802	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8c016324-b2b4-42b8-a89f-a46687f7e589	ngu	\N	f	2026-01-21 09:53:08.809528+00
1ba91332-eeb7-4eb0-9346-e554d217d24c	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	8c016324-b2b4-42b8-a89f-a46687f7e589	ngu	\N	f	2026-01-21 09:53:29.060737+00
db23a493-69bc-4a4e-98b3-35fec3710696	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	02d46548-0441-412d-b12b-f0830a264840	nguyenvansinh	\N	f	2026-01-21 09:54:24.320231+00
254f9eeb-1fd6-460f-bc57-fb24500a64b3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	02d46548-0441-412d-b12b-f0830a264840	nguyenvansinh	\N	f	2026-01-21 09:54:28.144288+00
f126c2a4-099e-46e0-8bf6-b492f4c32dcf	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	02d46548-0441-412d-b12b-f0830a264840	nguyenvansinh	\N	f	2026-01-21 09:54:36.67781+00
a671fdc2-1875-4ce9-a3a5-73eb7bb3f97e	ca24214f-9f3f-40f2-8c59-900f3124c5c8	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "Cây lúa" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-24 18:21:27.891125+00
ef6faaaa-674f-40b6-b822-ca7f758ca8cf	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	bf7fddef-097c-4ab3-902c-1518c74a15cf	nguyengiang	\N	f	2026-01-21 09:55:57.211733+00
a559b0a8-686d-4a27-8321-dabeb0a7bbf9	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "BẠN CÓ BAO GIỜ NGHĨ MÌNH SẼ TOP1 HACKATHON YDCC"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	bf7fddef-097c-4ab3-902c-1518c74a15cf	nguyengiang	\N	f	2026-01-21 09:55:59.411816+00
164a3fb3-0023-4266-9d47-1ca24e602a84	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	df78758b-da56-491d-a5c4-0c57316a771b	nguyenlytuong	\N	f	2026-01-21 10:20:37.01549+00
a8979fc9-35de-4484-aa02-ada0941b04a6	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	df78758b-da56-491d-a5c4-0c57316a771b	nguyenlytuong	\N	f	2026-01-21 10:20:38.44897+00
0f98ad5c-99ad-49d2-b6a5-694092be4b62	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	df78758b-da56-491d-a5c4-0c57316a771b	nguyenlytuong	\N	f	2026-01-21 10:20:41.651398+00
a6971d4e-37ff-43ea-bc90-4f3582c8d397	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	df78758b-da56-491d-a5c4-0c57316a771b	nguyenlytuong	\N	f	2026-01-21 10:20:44.744479+00
aecfa974-9ec0-4d32-9666-eb0ecd3a5c94	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	df78758b-da56-491d-a5c4-0c57316a771b	nguyenlytuong	\N	f	2026-01-21 10:20:51.622712+00
7def0594-216e-43f9-a6cc-9a4644435a44	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	df78758b-da56-491d-a5c4-0c57316a771b	nguyenlytuong	\N	f	2026-01-21 10:20:59.603607+00
9e31c13b-5c9e-42bb-a558-82b6892fb141	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	df78758b-da56-491d-a5c4-0c57316a771b	nguyenlytuong	\N	f	2026-01-21 10:21:01.928584+00
e0398607-e42a-45ae-8114-6ff79deb1ade	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8c6c740c-b564-48ae-9b85-a164e99155fd	tranthilan	\N	f	2026-01-21 10:22:43.321104+00
82eed5de-dd9d-4472-8351-2e65c8b94e91	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8c6c740c-b564-48ae-9b85-a164e99155fd	tranthilan	\N	f	2026-01-21 10:22:52.113851+00
b2457106-8083-4ce5-8285-844ac043bef6	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	2374dd2e-e380-45d4-a350-bedbaae40ad0	nhatnam	\N	f	2026-03-25 19:02:05.786038+00
057b87fa-80b7-4a6b-8725-2f546ef256a1	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	97d42fa7-76a1-41f1-bedc-90ee426c32bf	phanchautrinh	\N	f	2026-01-21 10:24:25.792635+00
a361fcce-9af1-4a39-af60-c1579cad1bee	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	97d42fa7-76a1-41f1-bedc-90ee426c32bf	phanchautrinh	\N	f	2026-01-21 10:24:27.931192+00
4f2f17f7-50a0-42f2-8154-8b4f0906098b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	97d42fa7-76a1-41f1-bedc-90ee426c32bf	phanchautrinh	\N	f	2026-01-21 10:24:30.090666+00
bf6c5b7b-cb2e-4f8b-a117-9cc2511932d1	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	nguyenthitrucuyen	\N	f	2026-01-21 10:26:20.932242+00
73de4477-fc07-46b4-8788-29edb6da52f3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	nguyenthitrucuyen	\N	f	2026-01-21 10:26:23.427872+00
6047bf84-58be-4b77-9e9f-8b47371ca1e3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	tranducchien	\N	f	2026-01-21 10:27:21.071816+00
09d4b910-3759-4955-bc55-c2a5b40bb1d6	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	tranducchien	\N	f	2026-01-21 10:27:25.058698+00
861254bd-e594-4b70-8910-367505ede432	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4975439b-f977-44a7-b6ac-cecd2732e105	trananhtu	\N	f	2026-01-21 10:28:11.984227+00
a490b8f2-0d68-49ff-b588-4e170fb0299e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4975439b-f977-44a7-b6ac-cecd2732e105	trananhtu	\N	f	2026-01-21 10:28:13.672858+00
5d9371e0-126f-4048-b047-8ee10ce516f9	d4e15dfe-84c9-489a-997f-4303eb9de453	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "test" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-24 18:23:49.513119+00
4b9a8b07-0419-4fbe-95be-d53c3fe56120	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	4975439b-f977-44a7-b6ac-cecd2732e105	trananhtu	\N	f	2026-01-21 10:28:19.971958+00
7c8b94f7-dba8-4e60-9554-88585371fe65	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4975439b-f977-44a7-b6ac-cecd2732e105	trananhtu	\N	f	2026-01-21 10:28:23.548365+00
39044f24-86e7-4962-9758-3f50a69dea90	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8bc0ba75-9312-45a3-9848-b6d2ff53501c	nguyenphuongly	\N	f	2026-01-21 10:29:04.071807+00
96d9331c-f72c-4748-b0fe-f0cf139cdf42	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8bc0ba75-9312-45a3-9848-b6d2ff53501c	nguyenphuongly	\N	f	2026-01-21 10:29:19.617564+00
5f7ad8c3-02ae-4ec0-9970-4f329784ba8a	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	ab956951-8ac0-4c28-9c8c-0a76af78c939	nguyenbanhtien	\N	f	2026-01-21 10:30:10.790326+00
043504c5-b716-4a0d-8665-1dff3061fa33	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	ab956951-8ac0-4c28-9c8c-0a76af78c939	nguyenbanhtien	\N	f	2026-01-21 10:30:12.730175+00
afa89a5c-01ff-48c6-bc85-36d8732e32a4	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	vinafoodii	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/e65ce75b-fdd6-4b2b-b6c8-c189c5030404/1768981102147.jpg	f	2026-03-28 02:43:16.894234+00
b2965b98-c44c-4b1e-b2ff-b69be8da8f74	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	nguyenlongdinh	\N	f	2026-01-21 10:31:46.766811+00
83c9f73f-99fc-4ea6-97c6-6448a3132aca	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	nguyenlongdinh	\N	f	2026-01-21 10:31:48.143799+00
cdcdf4fd-0f45-4125-8f48-27534e0b99ac	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	nguyenlongdinh	\N	f	2026-01-21 10:31:54.300391+00
092ad744-1a6a-4d7f-9ba7-70f0628a6591	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	00c9aa5d-0912-4be0-9d96-d90d74d25438	hoanglananh	\N	f	2026-01-21 10:32:51.353027+00
1e916c41-0b04-454c-8313-58605dc70211	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	00c9aa5d-0912-4be0-9d96-d90d74d25438	hoanglananh	\N	f	2026-01-21 10:32:53.425886+00
7a83fe56-4245-4801-9d6b-079665415135	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	00c9aa5d-0912-4be0-9d96-d90d74d25438	hoanglananh	\N	f	2026-01-21 10:32:56.256464+00
dbcf01d3-31bc-452e-b7f0-a84efe5b5ed1	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG"	/posts/5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	00c9aa5d-0912-4be0-9d96-d90d74d25438	hoanglananh	\N	f	2026-01-21 10:32:58.508163+00
0aca3a24-e21a-4a9a-afbd-373386d805f1	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	00c9aa5d-0912-4be0-9d96-d90d74d25438	hoanglananh	\N	f	2026-01-21 10:33:00.135615+00
090ef4ea-f70a-4db1-92be-e4fdddcbbca9	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	00c9aa5d-0912-4be0-9d96-d90d74d25438	hoanglananh	\N	f	2026-01-21 10:33:02.156144+00
a3cded0b-841f-4238-937f-628a0232ac88	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4c9b06d2-6e48-490f-9aca-827a7b94d76b	nguyendinhquan	\N	f	2026-01-21 10:33:48.137941+00
45034f32-197a-4b68-a4f7-a3e2db2303d3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4c9b06d2-6e48-490f-9aca-827a7b94d76b	nguyendinhquan	\N	f	2026-01-21 10:33:50.075352+00
2d2b35bb-3ce3-4cb1-9657-784fb567a9ae	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	766613de-ab18-45a2-9c57-ab6e838c91aa	nguyenkhanhlinh	\N	f	2026-01-21 10:34:43.816928+00
7a8f6c7e-968a-4252-b4a0-da7a413b1e54	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	766613de-ab18-45a2-9c57-ab6e838c91aa	nguyenkhanhlinh	\N	f	2026-01-21 10:34:50.841789+00
af86748e-dea1-46cf-9529-5c00155e187a	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	766613de-ab18-45a2-9c57-ab6e838c91aa	nguyenkhanhlinh	\N	f	2026-01-21 10:34:52.612659+00
2b3aca1a-1ad1-4c9e-aa1d-64b54640aa93	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	a180426f-c6d9-4ed7-b56b-c299364d2c4f	dipminhchau	\N	f	2026-01-21 10:46:50.856156+00
e32d4950-7544-44c6-9b37-4c3e7848f98f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	a180426f-c6d9-4ed7-b56b-c299364d2c4f	dipminhchau	\N	f	2026-01-21 10:46:53.183684+00
e6f30194-b0f2-4acc-b60b-820393813fd8	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	9b348117-d9c8-44b7-b321-4c8a3ce50818	phannhathy	\N	f	2026-01-22 00:34:15.770628+00
bda60504-fa3f-4c18-a617-f5fc1708600e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9b348117-d9c8-44b7-b321-4c8a3ce50818	phannhathy	\N	f	2026-01-22 00:34:18.285868+00
22fc1ab3-2dc0-4803-8769-923a2e082ef8	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9b348117-d9c8-44b7-b321-4c8a3ce50818	phannhathy	\N	f	2026-01-22 00:34:19.780355+00
e149cd7c-fd04-4a1d-93c4-5f8cb9f03781	6c45203b-a5ff-4f1c-be40-6bce6188f757	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "Giống lúa ST24 và ST25 " của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-25 01:35:47.229066+00
6e007a18-9e06-4f93-9ed7-32b874ee620a	4e9dd36c-38f2-4353-a320-0c31fa3cc970	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "Đầu phun nước tưới" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-03-28 02:45:28.401796+00
f663c0bf-5a91-4041-8d03-be785445871b	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	511c3f9d-9125-4586-b351-45348ad11743	lanquynhanh	\N	f	2026-01-22 00:35:14.991896+00
c32c7226-1244-4e81-a125-bcec635fae9b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	511c3f9d-9125-4586-b351-45348ad11743	lanquynhanh	\N	f	2026-01-22 00:35:17.263056+00
17446abf-4c02-49e9-a22c-be067fbf2a0b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	511c3f9d-9125-4586-b351-45348ad11743	lanquynhanh	\N	f	2026-01-22 00:35:18.480796+00
1deff061-6ce6-4179-a110-a5436d962c30	6c45203b-a5ff-4f1c-be40-6bce6188f757	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "Máy đo độ mặn cầm tay HI9835 chuẩn Châu Âu" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-25 01:35:51.158976+00
9465672f-58fe-49fc-8981-dea6258dd9ed	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/511c3f9d-9125-4586-b351-45348ad11743	511c3f9d-9125-4586-b351-45348ad11743	lanquynhanh	\N	f	2026-01-22 00:35:43.152291+00
1f9f32c7-f1d0-41aa-b513-5da554db8184	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/511c3f9d-9125-4586-b351-45348ad11743	511c3f9d-9125-4586-b351-45348ad11743	lanquynhanh	\N	f	2026-01-22 00:35:54.943952+00
ee6b442c-b9b8-4518-a944-c396aa4df610	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	c9af8e81-b717-4d88-9a7c-5f821c0a384e	nguyentanphat	\N	f	2026-01-22 00:38:46.022356+00
6aa2f582-304e-485d-8563-a074fb6334c7	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c9af8e81-b717-4d88-9a7c-5f821c0a384e	nguyentanphat	\N	f	2026-01-22 00:38:49.317317+00
24f6b631-9e22-4bb3-a772-89a9e49b0649	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c9af8e81-b717-4d88-9a7c-5f821c0a384e	nguyentanphat	\N	f	2026-01-22 00:38:50.608852+00
60491604-ee4d-4333-9f88-e46cf7211ced	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	PROJECT_INVESTMENT	Đầu tư mới	đã đầu tư vào dự án: "HỆ THỐNG ĐIỀU TIẾT NƯỚC VÀ KIỂM SOÁT XÂM NHẬP MẶN "	/invest/4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	vinafoodii	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/e65ce75b-fdd6-4b2b-b6c8-c189c5030404/1768981102147.jpg	f	2026-03-30 05:42:03.324331+00
5d33c988-5fa9-48f4-b65d-669179eaf09c	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	e391e0c4-a811-4ac0-9989-b426e101833d	nguyentutrinh	\N	f	2026-01-22 00:39:56.389882+00
7c62008a-4e53-4ccd-ac3e-e1a221c88e96	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e391e0c4-a811-4ac0-9989-b426e101833d	nguyentutrinh	\N	f	2026-01-22 00:39:58.405688+00
e0670bcc-5c16-4a09-a8e0-60ccac0859b4	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e391e0c4-a811-4ac0-9989-b426e101833d	nguyentutrinh	\N	f	2026-01-22 00:39:59.603754+00
b493eb2a-d891-4645-93cf-e7261b639eb7	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	50644fc3-8363-44f2-836e-61b3a252478d	phanquynhanhh	\N	f	2026-01-22 00:41:45.028691+00
007928a1-c522-4a39-9d04-776d565848e8	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/50644fc3-8363-44f2-836e-61b3a252478d	50644fc3-8363-44f2-836e-61b3a252478d	phanquynhanhh	\N	f	2026-01-22 00:41:47.974882+00
ca23b997-f8e2-45ae-9ac4-abf2817b401c	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	50644fc3-8363-44f2-836e-61b3a252478d	phanquynhanhh	\N	f	2026-01-22 00:41:51.374866+00
05c02d5c-86cf-4bf9-955d-cef450409a80	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	50644fc3-8363-44f2-836e-61b3a252478d	phanquynhanhh	\N	f	2026-01-22 00:41:54.290622+00
c433bf47-f3f3-45a5-9004-aa67b7695715	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	529cb4b3-5936-4705-be79-f332013e0beb	phamqanhoanh	\N	f	2026-01-22 00:43:01.747951+00
7afddfe9-edf6-4da7-bce2-1f5230947a59	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	529cb4b3-5936-4705-be79-f332013e0beb	phamqanhoanh	\N	f	2026-01-22 00:43:12.115128+00
169f4373-e77e-45c2-93f5-366f60d38a6c	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	529cb4b3-5936-4705-be79-f332013e0beb	phamqanhoanh	\N	f	2026-01-22 00:43:15.863204+00
f6a65cd0-6f02-4e8a-bc78-41cec4608684	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	529cb4b3-5936-4705-be79-f332013e0beb	phamqanhoanh	\N	f	2026-01-22 00:43:21.481589+00
ada0b752-8a57-489e-8920-3c1a1f4d5dd1	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	nguyenyenvy	\N	f	2026-01-22 00:44:08.995524+00
b9ceb93b-d157-4271-906b-e8a96e7f9a88	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	nguyenyenvy	\N	f	2026-01-22 00:44:11.053423+00
711cbadd-8516-480e-aa0d-cc12e140f77a	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	nguyenyenvy	\N	f	2026-01-22 00:44:12.369563+00
a22445fe-6754-436b-a276-e00bb2172ab4	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	nguyenyenvy	\N	f	2026-01-22 00:45:00.308686+00
ba8754b2-7f0d-45b1-81d0-045e51b8b4e7	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	nguyenyenvy	\N	f	2026-01-22 00:45:09.708138+00
6c8828ea-eab1-4259-a9b6-4c80b6f9240f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c35ce40a-b44f-49a7-aa8e-ed95060759b1	nguyentuuyen	\N	f	2026-01-22 00:46:01.392205+00
6dfb9fac-0a30-402c-8541-a0eed3b5b8c9	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c35ce40a-b44f-49a7-aa8e-ed95060759b1	nguyentuuyen	\N	f	2026-01-22 00:46:03.234902+00
0f0a57c4-e274-4eaf-a7f9-1c53b8a1fa7d	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	c35ce40a-b44f-49a7-aa8e-ed95060759b1	nguyentuuyen	\N	f	2026-01-22 00:46:06.708872+00
024300ae-d621-460d-a60b-0e74aa81f9ba	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c35ce40a-b44f-49a7-aa8e-ed95060759b1	nguyentuuyen	\N	f	2026-01-22 00:46:09.29072+00
e6b4bf34-c3ed-4e2e-8d02-84b150f41f89	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	c35ce40a-b44f-49a7-aa8e-ed95060759b1	nguyentuuyen	\N	f	2026-01-22 00:46:12.603901+00
6de1bb24-9f83-4057-9bea-14b1a9d9889e	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/c35ce40a-b44f-49a7-aa8e-ed95060759b1	c35ce40a-b44f-49a7-aa8e-ed95060759b1	nguyentuuyen	\N	f	2026-01-22 00:46:17.892544+00
f6ef2287-a31e-4872-b75f-a4a01a244bcd	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	791939bf-486b-4d03-98df-7eefd4aa15f2	phamdinhquangg	\N	t	2026-01-22 00:49:41.748725+00
e2969a8c-bfcb-4895-aa18-e848ee8ba8a0	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	6137e67a-d461-46fd-ac2a-17ce6c29b22f	phanquananh	\N	f	2026-01-22 00:47:30.84329+00
8e8a9214-5c29-42a9-8bca-b056df1139e3	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	6137e67a-d461-46fd-ac2a-17ce6c29b22f	phanquananh	\N	f	2026-01-22 00:47:34.577383+00
8a57b51f-ef7f-4692-9454-6abc8a3a34ea	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6137e67a-d461-46fd-ac2a-17ce6c29b22f	phanquananh	\N	f	2026-01-22 00:47:37.642957+00
cd0daf47-bee6-4187-9429-81e83d45309c	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	6137e67a-d461-46fd-ac2a-17ce6c29b22f	phanquananh	\N	f	2026-01-22 00:47:40.076873+00
3002772c-7615-4b00-8663-6d2c2ed46414	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	6137e67a-d461-46fd-ac2a-17ce6c29b22f	phanquananh	\N	f	2026-01-22 00:47:43.036031+00
0f70345a-86d2-498c-9f99-fcf971f505e4	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/6137e67a-d461-46fd-ac2a-17ce6c29b22f	6137e67a-d461-46fd-ac2a-17ce6c29b22f	phanquananh	\N	f	2026-01-22 00:47:48.871443+00
37729be3-d750-4fa1-9bb3-d6ef2c3b41a8	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/6137e67a-d461-46fd-ac2a-17ce6c29b22f	6137e67a-d461-46fd-ac2a-17ce6c29b22f	phanquananh	\N	f	2026-01-22 00:47:59.161462+00
0a6a597c-f247-4597-bf03-66059821be03	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	791939bf-486b-4d03-98df-7eefd4aa15f2	phamdinhquangg	\N	f	2026-01-22 00:48:45.991181+00
260b5028-5754-4595-91de-29ce9aad07a9	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	791939bf-486b-4d03-98df-7eefd4aa15f2	phamdinhquangg	\N	f	2026-01-22 00:49:22.772308+00
0c46dcc3-9b18-43a7-8048-f5d885b8ce57	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	791939bf-486b-4d03-98df-7eefd4aa15f2	phamdinhquangg	\N	f	2026-01-22 00:49:23.83647+00
4d0003a5-e6aa-49f0-a549-9d37f3069193	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	791939bf-486b-4d03-98df-7eefd4aa15f2	phamdinhquangg	\N	f	2026-01-22 00:49:27.831079+00
852e596d-7d49-4dd7-94c6-ee88039dbf49	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/791939bf-486b-4d03-98df-7eefd4aa15f2	791939bf-486b-4d03-98df-7eefd4aa15f2	phamdinhquangg	\N	f	2026-01-22 00:49:33.041897+00
1b6e3006-0fee-4999-9722-186d7eae14dc	6c45203b-a5ff-4f1c-be40-6bce6188f757	PROJECT_APPROVED	Dự án đầu tư đã được phê duyệt	Dự án "MÔ HÌNH TRỮ NƯỚC NGỌT PHÂN TÁN KẾT HỢP CẢM BIẾN MẶN CHO NÔNG DÂN VÙNG VEN BIỂN ĐỒNG BẰNG SÔNG CỬU LONG" của bạn đã được Admin phê duyệt và sẵn sàng nhận đầu tư.	/invest	\N	\N	\N	f	2026-01-25 01:35:57.813465+00
943e148e-0297-495a-a657-8d2b2a05777f	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	791939bf-486b-4d03-98df-7eefd4aa15f2	phamdinhquangg	\N	f	2026-01-22 00:49:45.854283+00
d2682c07-44ef-4fe5-a0c5-ed69ea3a5ed7	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	nguyentantrung	\N	f	2026-01-22 00:50:56.971664+00
040ae623-ee9f-44ac-8821-5a0927db424f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	nguyentantrung	\N	f	2026-01-22 00:50:58.153313+00
3c1139aa-19d7-4749-bd29-7d9bbd7c71fb	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	phdhoanganh	\N	f	2026-03-30 10:07:11.747895+00
069ad4ae-5a9f-4ffb-a0fb-eef62d96758d	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	nguyentantrung	\N	f	2026-01-22 00:51:13.907628+00
8504b9f0-083b-4aa3-b53f-042baaa140c0	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	fc6c6611-60cb-44d8-8de7-613f7d7869b5	phankyy	\N	f	2026-01-22 00:52:06.631697+00
6c8344c0-be73-440d-9252-dc5f92796f57	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	fc6c6611-60cb-44d8-8de7-613f7d7869b5	phankyy	\N	f	2026-01-22 00:52:08.948075+00
0bdc69e7-0cb5-4aa9-865f-430699a9311e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	fc6c6611-60cb-44d8-8de7-613f7d7869b5	phankyy	\N	f	2026-01-22 00:52:13.597656+00
5bfb7149-e487-420d-a926-fa040a6e5dfb	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	fc6c6611-60cb-44d8-8de7-613f7d7869b5	phankyy	\N	f	2026-01-22 00:52:14.708563+00
82398685-ca6b-4d05-9d6f-53713c883a47	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8d390cb3-59e1-45c3-93a0-1459b74498a4	nguyenbaoly	\N	f	2026-01-22 00:53:19.172193+00
de4e6330-94d0-4393-b3ab-e37424d83dc3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8d390cb3-59e1-45c3-93a0-1459b74498a4	nguyenbaoly	\N	f	2026-01-22 00:53:20.59506+00
10367abb-6300-4ff2-9139-60dd552b0176	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	8d390cb3-59e1-45c3-93a0-1459b74498a4	nguyenbaoly	\N	f	2026-01-22 00:53:24.247176+00
81a17687-3aac-4020-bd03-6411efe70eb1	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	8d390cb3-59e1-45c3-93a0-1459b74498a4	nguyenbaoly	\N	f	2026-01-22 00:53:29.138471+00
3d350685-3d2b-4abb-b1a0-204c97cd29d3	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	8d390cb3-59e1-45c3-93a0-1459b74498a4	nguyenbaoly	\N	f	2026-01-22 00:53:30.777278+00
52bb5a54-7062-48fe-aa2f-6c745a85e8e7	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_COMMENT	Bình luận mới	đã bình luận bài viết: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	8d390cb3-59e1-45c3-93a0-1459b74498a4	nguyenbaoly	\N	f	2026-01-22 00:54:15.301108+00
a43242ae-4d1b-413a-88e3-01a127291479	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	PRODUCT_APPROVED	Sản phẩm đã được phê duyệt	Sản phẩm "HỆ THỐNG TƯỚI TIÊU EU" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.	/products	\N	\N	\N	f	2026-01-25 03:47:16.200877+00
3b219453-f72f-4a39-8a03-ecaa72055cf2	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	16da4e53-c6ee-427a-9944-3794eaa52a05	kimuyen_1107	\N	f	2026-03-30 10:07:13.376722+00
b41116fc-91ed-4968-aa5a-3483ff003728	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/8d390cb3-59e1-45c3-93a0-1459b74498a4	8d390cb3-59e1-45c3-93a0-1459b74498a4	nguyenbaoly	\N	f	2026-01-22 00:54:27.60045+00
791e9177-4338-4382-b8b7-fc0985fbda36	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	c801a58c-8dde-4ff0-9193-cd33de0e1e03	phamkyuyenan	\N	f	2026-01-22 01:00:51.976155+00
5dc775a6-dcf4-452d-b6e5-73279f3351ff	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	c801a58c-8dde-4ff0-9193-cd33de0e1e03	phamkyuyenan	\N	f	2026-01-22 01:00:59.377383+00
efe2d675-95ab-4a4d-8357-c549e8c3e83c	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c801a58c-8dde-4ff0-9193-cd33de0e1e03	phamkyuyenan	\N	f	2026-01-22 01:01:03.895117+00
d5148b92-ac8b-4a33-a549-37c6e45d6c4a	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	c801a58c-8dde-4ff0-9193-cd33de0e1e03	phamkyuyenan	\N	f	2026-01-22 01:01:06.87188+00
08420204-f59f-4164-8865-374c758b24ef	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c801a58c-8dde-4ff0-9193-cd33de0e1e03	phamkyuyenan	\N	f	2026-01-22 01:01:09.018594+00
6e325bff-31c4-4d79-b712-4195a49a3f30	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c801a58c-8dde-4ff0-9193-cd33de0e1e03	phamkyuyenan	\N	f	2026-01-22 01:01:11.110705+00
a3057812-7cba-48d7-a1ac-7fd3523d5191	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	PROJECT_INVESTMENT	Đầu tư mới	đã đầu tư vào dự án: "HỆ THỐNG ĐIỀU TIẾT NƯỚC VÀ KIỂM SOÁT XÂM NHẬP MẶN "	/invest/4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	\N	f	2026-01-25 04:23:08.462545+00
d9480952-8293-49be-9859-ce6bd416b3e0	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	phdhoanganh	\N	f	2026-03-30 10:07:13.617653+00
bc00ab9b-0721-4df0-a764-e606626095c5	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	tranhungthu	\N	f	2026-01-22 01:08:14.870349+00
d01ce8a5-bff5-4245-9129-4867b0e0367c	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	tranhungthu	\N	f	2026-01-22 01:08:17.330999+00
2b0cf055-8d01-4560-a5a4-9c5cddbe25c1	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	tranhungthu	\N	f	2026-01-22 01:08:26.231409+00
e284fc51-9778-4f88-ac60-d345bcb77fdd	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	71415285-c1cb-4855-82ee-37585c51eef9	vophanbaoloan	\N	f	2026-01-22 01:09:29.62947+00
9661a53a-323f-4b3b-b29c-970e13c717ec	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	71415285-c1cb-4855-82ee-37585c51eef9	vophanbaoloan	\N	f	2026-01-22 01:09:32.880584+00
d4104d68-e633-4c83-bf3e-b385b7f5de9c	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	71415285-c1cb-4855-82ee-37585c51eef9	vophanbaoloan	\N	f	2026-01-22 01:09:34.967132+00
b3e2ac0c-b74a-48ad-85a7-c405e0bfa998	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	d40eddeb-94f1-4a8e-b05e-f8a02843b691	phamquynhanhgiang	\N	f	2026-01-22 01:12:26.234722+00
a81f7948-a7f7-4b3f-b557-bdadbf7c43e9	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d40eddeb-94f1-4a8e-b05e-f8a02843b691	phamquynhanhgiang	\N	f	2026-01-22 01:12:27.855263+00
6f2910b3-4318-4c19-b959-90cd51454dc4	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d40eddeb-94f1-4a8e-b05e-f8a02843b691	phamquynhanhgiang	\N	f	2026-01-22 01:12:29.379239+00
5aca95da-5b24-4567-8f89-bec133b9a468	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/d40eddeb-94f1-4a8e-b05e-f8a02843b691	d40eddeb-94f1-4a8e-b05e-f8a02843b691	phamquynhanhgiang	\N	f	2026-01-22 01:12:33.660824+00
04064ffc-af75-4979-8231-a9c749e8ab96	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	trancongphong	\N	f	2026-01-22 01:15:18.852274+00
10f811ce-98af-41f4-8d1c-a0b141ab02d6	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	trancongphong	\N	f	2026-01-22 01:15:19.626945+00
2289237f-ba27-473a-bb0a-2b79343192e5	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/0a0c0f64-1a4d-4973-ba98-942a0a381c8a	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	trancongphong	\N	f	2026-01-22 01:15:53.850551+00
de47de93-afe7-4548-9d02-2cd78c1a8cd9	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	1919a069-3c62-4408-9f6b-aba65bbdcce7	nguyenmanhtuantran	\N	f	2026-01-22 01:16:45.670582+00
8b47cc13-d71c-4bba-837a-7a20efa6bbc2	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1919a069-3c62-4408-9f6b-aba65bbdcce7	nguyenmanhtuantran	\N	f	2026-01-22 01:16:47.994511+00
72f5ed07-d963-488f-bff8-c03e3e923e0b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1919a069-3c62-4408-9f6b-aba65bbdcce7	nguyenmanhtuantran	\N	f	2026-01-22 01:16:50.102602+00
d804aefa-cce5-49e0-8c25-2208a23ced32	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	phdhoanganh	\N	f	2026-03-30 10:07:15.483594+00
9b5d15f9-c6eb-44b3-ae05-a98d3903b51b	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/1919a069-3c62-4408-9f6b-aba65bbdcce7	1919a069-3c62-4408-9f6b-aba65bbdcce7	nguyenmanhtuantran	\N	f	2026-01-22 01:16:57.170237+00
b6e620cd-289b-4061-8f77-f515df982ad0	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	16da4e53-c6ee-427a-9944-3794eaa52a05	kimuyen_1107	\N	f	2026-03-30 10:07:17.505984+00
622a7099-02ac-43bf-bee0-e7b2128f94c8	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	31b8206a-ea5d-41cf-968e-6f19b87aba62	manhlantu	\N	f	2026-01-22 01:18:52.668292+00
b41061ab-6ad6-4442-9ed0-ce2abaa5d607	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	31b8206a-ea5d-41cf-968e-6f19b87aba62	manhlantu	\N	f	2026-01-22 01:18:54.45156+00
ff23f652-461b-4358-878c-25c34adc4f40	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/31b8206a-ea5d-41cf-968e-6f19b87aba62	31b8206a-ea5d-41cf-968e-6f19b87aba62	manhlantu	\N	f	2026-01-22 01:19:01.968075+00
a6b3e7c7-899b-44da-b7c5-e111b9e2b9f6	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	31b8206a-ea5d-41cf-968e-6f19b87aba62	manhlantu	\N	f	2026-01-22 01:19:05.653686+00
d2bbf786-5288-413e-aab8-80c3dc388c27	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	31b8206a-ea5d-41cf-968e-6f19b87aba62	manhlantu	\N	f	2026-01-22 01:19:08.891648+00
ad49d6c8-eafa-421f-b1ea-c00a209c0726	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	nguyentriphuong	\N	f	2026-01-22 01:19:59.594939+00
4480e554-b634-4ef4-a07a-364fe22ccb74	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	nguyentriphuong	\N	f	2026-01-22 01:20:01.496778+00
8c35a260-bf9b-4ad6-822a-4dab823b3108	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	761258bd-d832-4b3e-8f14-bb8e3f934d26	nguyenphamkyduyen	\N	f	2026-01-22 01:21:32.222461+00
68ebde1a-1f23-4cec-b64c-f78fa1e16a26	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	761258bd-d832-4b3e-8f14-bb8e3f934d26	nguyenphamkyduyen	\N	f	2026-01-22 01:21:33.439986+00
d21291ea-715f-47d8-ab1a-c2fa6957dd45	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/761258bd-d832-4b3e-8f14-bb8e3f934d26	761258bd-d832-4b3e-8f14-bb8e3f934d26	nguyenphamkyduyen	\N	f	2026-01-22 01:21:39.379066+00
b718e8a9-cc84-4823-a45a-6ec37405d952	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	f8e9a265-897e-43b8-adee-a431e9c3bee9	tranthicuctu	\N	f	2026-01-22 01:23:12.286165+00
e23ad055-6f02-4ece-a87a-774a01d905ce	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	f8e9a265-897e-43b8-adee-a431e9c3bee9	tranthicuctu	\N	f	2026-01-22 01:23:14.01619+00
a7caf056-da5e-4ec8-b3d8-919ee47a1608	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	f8e9a265-897e-43b8-adee-a431e9c3bee9	tranthicuctu	\N	f	2026-01-22 01:23:15.077855+00
4c503eb6-ae06-49c7-b5c5-de630884e21f	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	nguyenlytung	\N	f	2026-01-22 01:24:28.555535+00
7ed24ca2-bca8-4f9a-9bfd-d498e45b0ee3	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	nguyenlytung	\N	f	2026-01-22 01:24:36.461761+00
003abdf0-0c0a-41a9-905f-082b52afcc32	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	nguyenlytung	\N	f	2026-01-22 01:24:38.921686+00
d47d5505-e2e4-4fb3-8b9d-9a048d10babc	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	nguyenlytung	\N	f	2026-01-22 01:24:40.307392+00
4260e4ac-2e67-4350-af09-44f7194d1a1e	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	nguyenlytung	\N	f	2026-01-22 01:24:44.966814+00
60f745e7-e4fb-47df-a8cc-00c0d8b5dac6	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	trananhtoan	\N	f	2026-01-22 01:26:06.635506+00
d58a9a5c-c5c7-4a86-a543-3e2a82c14c63	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	trananhtoan	\N	f	2026-01-22 01:26:11.418709+00
e97e7149-14b1-4665-9cea-7461dd8b768f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	trananhtoan	\N	f	2026-01-22 01:26:15.813403+00
d10ce69c-c033-4450-98bb-f05eaedeab8c	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	trananhtoan	\N	f	2026-01-22 01:26:17.866712+00
9007666a-b778-4e00-8965-a08f74e00427	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/54f5d7bb-aa49-4490-8ad0-7a95b5defa23	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	trananhtoan	\N	f	2026-01-22 01:26:20.518856+00
2948118c-1f68-45c2-a920-5e13256e1435	97d42fa7-76a1-41f1-bedc-90ee426c32bf	COMMENT_REPLY	Trả lời bình luận	đã trả lời bình luận của bạn trong: "Kinh nghiệm xử lý mặn cho cây lúa"	/posts/d41a6dbf-b002-4b46-ac48-f35492f3814d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	f	2026-04-02 12:11:21.249399+00
e349589c-2742-4c6d-87ee-e0e884d3fb61	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	65b54fdc-6983-4242-8b99-823e47f3a0a7	phamquynh	\N	f	2026-01-22 01:27:27.798839+00
e7cd3e0f-61b8-4f94-9f5c-14747c5f1876	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	65b54fdc-6983-4242-8b99-823e47f3a0a7	phamquynh	\N	f	2026-01-22 01:27:39.219424+00
fec8d2e9-8c6c-470e-aa77-a297e06bc41c	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	65b54fdc-6983-4242-8b99-823e47f3a0a7	phamquynh	\N	f	2026-01-22 01:28:50.690875+00
a70e1a1a-f855-4f02-9513-0d384479d6ed	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/65b54fdc-6983-4242-8b99-823e47f3a0a7	65b54fdc-6983-4242-8b99-823e47f3a0a7	phamquynh	\N	f	2026-01-22 01:28:54.567287+00
650cd606-92ae-4afc-b822-e45837fbd404	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	cfd6e3a8-82ce-4a45-b613-0e78fa463439	luumonglung	\N	f	2026-01-22 01:30:31.258215+00
3e9c27b3-49ee-454c-8742-c7fd6604d5b2	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	cfd6e3a8-82ce-4a45-b613-0e78fa463439	luumonglung	\N	f	2026-01-22 01:30:32.430528+00
a4e3d520-6d76-4e60-8662-1c4ea680d1d2	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/cfd6e3a8-82ce-4a45-b613-0e78fa463439	cfd6e3a8-82ce-4a45-b613-0e78fa463439	luumonglung	\N	f	2026-01-22 01:30:38.954063+00
5b0358b0-8637-479a-9135-8f9e67404ca0	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	cfd6e3a8-82ce-4a45-b613-0e78fa463439	luumonglung	\N	f	2026-01-22 01:30:42.383221+00
5a7885b7-55a1-4c9c-b21d-b5939bc6a47f	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	trananhtoan	\N	t	2026-01-22 01:26:32.1624+00
8625f241-ad8e-42e3-99bb-14610a74a63c	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	af98d38f-7f5e-42d6-8349-e30c5a006801	nguyentankhiem	\N	f	2026-01-22 01:37:20.467219+00
366f64d6-9879-4a01-87cc-c80c5f3caef4	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	af98d38f-7f5e-42d6-8349-e30c5a006801	nguyentankhiem	\N	f	2026-01-22 01:37:32.913986+00
2b282591-e776-434b-bfe5-f0ba2b07cbaa	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	af98d38f-7f5e-42d6-8349-e30c5a006801	nguyentankhiem	\N	f	2026-01-22 01:37:34.251626+00
7d45364a-9a77-4bb7-b7df-c9af11e1576b	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	660e5db2-b63a-4a80-9e03-61b9676a25f0	anhtu	\N	f	2026-04-04 14:09:16.549824+00
b5044cbd-b767-4ffe-a257-d4700526a57a	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	5981f73f-c8eb-46ca-97cf-61bb2373bc52	nguyenphuongtrinh	\N	f	2026-01-22 01:38:45.036985+00
2c59fcec-5723-4b7d-8471-bde4de941e16	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5981f73f-c8eb-46ca-97cf-61bb2373bc52	nguyenphuongtrinh	\N	f	2026-01-22 01:38:48.022155+00
f660ce2f-c3cf-496d-a42f-d5e5eb7f6957	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/5981f73f-c8eb-46ca-97cf-61bb2373bc52	5981f73f-c8eb-46ca-97cf-61bb2373bc52	nguyenphuongtrinh	\N	f	2026-01-22 01:38:52.524948+00
1a9edf39-1495-417b-90d3-1ee9e38f6c12	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5981f73f-c8eb-46ca-97cf-61bb2373bc52	nguyenphuongtrinh	\N	f	2026-01-22 01:38:56.334583+00
4e527858-3fdf-480d-b9d3-e556692e6f16	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4733c4f2-b333-4f33-8526-490f50a57499	tranthingocanh	\N	f	2026-01-22 01:39:50.186563+00
279130d5-3dba-441f-a4b1-208eaf0fb218	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4733c4f2-b333-4f33-8526-490f50a57499	tranthingocanh	\N	f	2026-01-22 01:39:51.252618+00
0a71c687-662d-404b-a05d-4f2334926d19	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	4733c4f2-b333-4f33-8526-490f50a57499	tranthingocanh	\N	f	2026-01-22 01:40:32.143343+00
97caef9f-41fb-4c2f-8100-d32de03fc099	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/4733c4f2-b333-4f33-8526-490f50a57499	4733c4f2-b333-4f33-8526-490f50a57499	tranthingocanh	\N	f	2026-01-22 01:40:41.813485+00
f848ccbd-ade6-42b7-a0f8-6c669169eede	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	phannhutdangkhoa	\N	f	2026-01-22 01:41:38.106574+00
7187a5f5-4213-4f38-afbc-102216e48e1d	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	phannhutdangkhoa	\N	f	2026-01-22 01:41:40.559276+00
15fb3d26-e4b5-42f9-9499-4e7339feedec	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	phannhutdangkhoa	\N	f	2026-01-22 01:41:45.162423+00
b2aa0133-b95e-49cd-910a-5c9c2720fbc0	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/4f95bb6c-f9fd-4aa4-987d-d38b18473aea	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	phannhutdangkhoa	\N	f	2026-01-22 01:41:51.243459+00
5a5ad3d9-9dc2-40e1-a105-458147838a8d	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	nguyenainhan	\N	f	2026-01-22 01:43:37.600914+00
92db07c0-00c3-4627-b668-efb4d8235f60	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	nguyenainhan	\N	f	2026-01-22 01:43:39.079918+00
9f9188a0-45e5-4f82-9b6b-da0553933360	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	d28140c0-4739-4adb-b40c-dad97b2551bd	phamtheanh	\N	f	2026-01-22 01:44:53.755868+00
c896fd27-086c-46ed-8d0d-7f89ac70e6be	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d28140c0-4739-4adb-b40c-dad97b2551bd	phamtheanh	\N	f	2026-01-22 01:44:55.342667+00
c94765db-4b80-44a5-ae32-c5c7074438f9	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d28140c0-4739-4adb-b40c-dad97b2551bd	phamtheanh	\N	f	2026-01-22 01:44:56.412807+00
5fe496ce-980e-4660-9f2a-6420efe54bcb	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/d28140c0-4739-4adb-b40c-dad97b2551bd	d28140c0-4739-4adb-b40c-dad97b2551bd	phamtheanh	\N	f	2026-01-22 01:45:04.177952+00
a2ddfd9b-3d79-4da8-97a3-544ff86d0e66	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	29573c2b-fdf5-4831-974c-9851cb4d9fc3	phamhuonggiangnha	\N	f	2026-01-22 01:47:02.073266+00
6d8cfd8a-8584-4309-b7d5-d0f7fe271356	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	29573c2b-fdf5-4831-974c-9851cb4d9fc3	phamhuonggiangnha	\N	f	2026-01-22 01:47:04.301797+00
b00d1468-8f47-44ea-9b5f-d7e1fef28e8f	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/29573c2b-fdf5-4831-974c-9851cb4d9fc3	29573c2b-fdf5-4831-974c-9851cb4d9fc3	phamhuonggiangnha	\N	f	2026-01-22 01:47:10.204814+00
7cbc5970-ab2a-454f-9618-f2eba2f86dd9	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	1e2967ab-e057-4927-8fe4-b2f769a5a6df	trantantrungtung	\N	f	2026-01-22 01:48:44.106481+00
1e947341-d625-4784-b23c-b4fea1406a5d	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/1e2967ab-e057-4927-8fe4-b2f769a5a6df	1e2967ab-e057-4927-8fe4-b2f769a5a6df	trantantrungtung	\N	f	2026-01-22 01:48:49.312155+00
44886c45-dbb5-42e9-a5b4-40b076a2559a	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1e2967ab-e057-4927-8fe4-b2f769a5a6df	trantantrungtung	\N	f	2026-01-22 01:48:52.698761+00
c764425f-26ab-42c8-9fc9-aeeb71681584	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	1e2967ab-e057-4927-8fe4-b2f769a5a6df	trantantrungtung	\N	f	2026-01-22 01:48:53.781426+00
48a59942-d0a8-4135-a30f-2dbb84e1176e	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/1e2967ab-e057-4927-8fe4-b2f769a5a6df	1e2967ab-e057-4927-8fe4-b2f769a5a6df	trantantrungtung	\N	f	2026-01-22 01:48:59.121324+00
f9169c66-8b0e-4b1a-8a8b-0955d6feb09d	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	nguyentienlinh	\N	f	2026-01-22 01:50:17.095299+00
be41e502-6f8d-4fa0-8e54-66405664db1b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	nguyentienlinh	\N	f	2026-01-22 01:50:18.183054+00
1a59d5a3-adcc-4090-9106-f6d054802372	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	nguyentienlinh	\N	f	2026-01-22 01:50:25.251183+00
489fe67b-f4ce-4dfd-aa71-45b328ad10f6	06558882-7a10-4b69-b8e0-4fef2684a434	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	nguyentienlinh	\N	f	2026-01-22 01:51:22.147508+00
bab9c596-7a46-4bc4-9f79-e308f99d1c81	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	nguyenthinhuhang	\N	f	2026-01-22 01:52:29.630851+00
7a029fe4-dce0-4966-83af-417c40e675eb	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	nguyenthinhuhang	\N	f	2026-01-22 01:52:34.600592+00
4129fa61-0ad6-4068-bd3d-3041a2f3886e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	nguyenthinhuhang	\N	f	2026-01-22 01:52:38.106325+00
c82db13a-0484-4111-9843-4f11c48505e1	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	nguyenthinhuhang	\N	f	2026-01-22 01:52:39.348982+00
73f6c11f-de0a-4fb5-88ca-5b16759ba5cd	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	b9163fcb-75ec-4a35-8d45-1547315401ac	phamthuytrang	\N	f	2026-01-22 01:53:28.909004+00
819e7021-72d9-4e65-b8d0-0a97cf2b240e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b9163fcb-75ec-4a35-8d45-1547315401ac	phamthuytrang	\N	f	2026-01-22 01:53:33.177458+00
89fc0510-cd32-4d5c-9ab9-0d84cb7641b4	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b9163fcb-75ec-4a35-8d45-1547315401ac	phamthuytrang	\N	f	2026-01-22 01:53:34.24912+00
643fa0cd-deab-4c52-9b11-b305deb2cce8	06558882-7a10-4b69-b8e0-4fef2684a434	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	660e5db2-b63a-4a80-9e03-61b9676a25f0	anhtu	\N	f	2026-04-04 14:09:25.661152+00
50bea351-e961-4db5-b685-f708d477ea1f	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	\N	f	2026-01-22 01:54:50.349994+00
09a4ba36-82fa-4d71-aaef-a52e314de859	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	\N	f	2026-01-22 01:54:52.297804+00
cd7acc6d-1bb4-47ca-888a-c08f77f7f938	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/5d100834-5494-4217-ac7c-e02053c4f016	5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	\N	f	2026-01-22 01:54:57.376505+00
330baf39-a595-4330-ade5-6e50a787a7c5	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	dohongthoai	\N	f	2026-01-22 01:55:56.423834+00
9712c5b4-f106-4f8f-958b-0e3fd8066eec	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	dohongthoai	\N	f	2026-01-22 01:55:57.754093+00
0eeef4bb-a63e-4f36-9689-55620e70b632	06558882-7a10-4b69-b8e0-4fef2684a434	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TI"	/posts/a6d5ba70-20cf-40ed-a0c4-6c199fafee56	660e5db2-b63a-4a80-9e03-61b9676a25f0	anhtu	\N	f	2026-04-04 14:09:28.433412+00
5fa9e85e-9dce-4a1c-a8d8-3061829259b5	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	dohongthoai	\N	f	2026-01-22 01:56:04.159381+00
cdde744c-6e6d-42f1-9d57-fd0e1a3520a7	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	ae856958-69bf-432e-bab2-262340b92e0d	dothanhnhan	\N	f	2026-01-22 01:58:46.155679+00
c34b287c-544a-4ea1-a935-dd23ef4aad39	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	ae856958-69bf-432e-bab2-262340b92e0d	dothanhnhan	\N	f	2026-01-22 01:58:52.550501+00
68289f81-692e-4b95-9dc9-0af8ea23e4d2	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	2f835397-40fb-430f-96bb-3b23e988950e	phanthanhnhan	\N	f	2026-01-22 02:00:42.091772+00
b5704f82-e6ce-486c-996b-33308f39a3be	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	2f835397-40fb-430f-96bb-3b23e988950e	phanthanhnhan	\N	f	2026-01-22 02:01:36.118683+00
657fce66-fb61-41ff-a8ff-5cd18dc30ddf	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	2f835397-40fb-430f-96bb-3b23e988950e	phanthanhnhan	\N	f	2026-01-22 02:01:38.663917+00
974a8571-f326-45ce-a388-3309690526d3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	2f835397-40fb-430f-96bb-3b23e988950e	phanthanhnhan	\N	f	2026-01-22 02:01:39.93969+00
81483d25-9c8d-496d-94c5-d19784c903c4	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/2f835397-40fb-430f-96bb-3b23e988950e	2f835397-40fb-430f-96bb-3b23e988950e	phanthanhnhan	\N	f	2026-01-22 02:01:45.585801+00
44e1aaf5-5f9d-4cf9-979f-4153c0f71a98	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5c53db2c-057e-4bf6-9782-31a25c74e269	tranlequan	\N	f	2026-01-22 02:03:03.324117+00
738cbc11-0e2d-4a5b-a345-f28a3e611ba3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5c53db2c-057e-4bf6-9782-31a25c74e269	tranlequan	\N	f	2026-01-22 02:03:08.85257+00
d4540a39-c6aa-42d5-aac3-e21693732c9a	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/5c53db2c-057e-4bf6-9782-31a25c74e269	5c53db2c-057e-4bf6-9782-31a25c74e269	tranlequan	\N	f	2026-01-22 02:03:35.003091+00
d8d12d3d-8b9a-4a2b-8418-da901e9561bf	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	nguyenlehailong	\N	f	2026-01-22 02:06:30.793709+00
e8295b28-7ea5-4d2a-a4e7-ee7ee91c8f97	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	nguyenlehailong	\N	f	2026-01-22 02:06:35.680716+00
727fc1b1-bc1c-469f-811a-b0a12b62cd6a	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	nguyenlehailong	\N	f	2026-01-22 02:06:36.65109+00
b598e064-d8e1-4ffa-b173-1f531e4ea7f3	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	nguyenlehailong	\N	f	2026-01-22 02:06:42.518194+00
d0fb9d0b-8da7-4ddd-bb02-99a2ad2aa517	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b6d92a45-c510-4686-9f25-824bc32e96cb	tranthituyetnhu	\N	f	2026-01-22 02:08:15.380004+00
f83cf939-9cfb-4e55-af44-0333b377c9b4	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b6d92a45-c510-4686-9f25-824bc32e96cb	tranthituyetnhu	\N	f	2026-01-22 02:08:17.097167+00
11220cad-1a8a-429f-9ef5-b0cfdb33919d	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/b6d92a45-c510-4686-9f25-824bc32e96cb	b6d92a45-c510-4686-9f25-824bc32e96cb	tranthituyetnhu	\N	f	2026-01-22 02:08:21.553826+00
8c1f6aee-f32a-44b5-a965-e4c72fb5314b	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	nguyenthibaotran	\N	f	2026-01-22 02:09:30.410729+00
e5f90fbd-6f11-40b4-8e86-52c448cafd23	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	nguyenthibaotran	\N	f	2026-01-22 02:09:34.347747+00
a5e336ca-9ea5-40f8-bdea-fad40140b063	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	nguyenthibaotran	\N	f	2026-01-22 02:09:36.802856+00
6b5515a4-2122-45fd-a3f8-cc3545cf15ee	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	nguyenthibaotran	\N	f	2026-01-22 02:09:40.038655+00
0f0b3f52-c819-42fd-afbb-a2c8d1c15e7b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	nguyenthibaotran	\N	f	2026-01-22 02:09:43.54153+00
e836717d-8417-4956-852b-b12640b465df	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/e7192c5a-5314-4d99-a0e9-cf235dcad2cc	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	nguyenthibaotran	\N	f	2026-01-22 02:09:55.225151+00
8df8e828-d0f1-465b-87d1-796423fa20c7	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	hoanganh	\N	f	2026-01-22 02:11:19.618506+00
4119e26b-bf1e-4425-b8a1-4b8b009e87dd	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	hoanganh	\N	f	2026-01-22 02:11:20.798798+00
7d74e261-2108-461e-8bb5-3721f516ce36	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	hoanganh	\N	f	2026-01-22 02:11:25.064857+00
c893c30a-a062-4f6b-8eea-c0d84d4fbcd6	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	hoanganh	\N	f	2026-01-22 02:11:26.244155+00
55c2e05a-d953-4290-a75b-0ccda67f8c4a	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/62ba9225-b9c3-4760-9c1a-bab4f9a318e8	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	hoanganh	\N	f	2026-01-22 02:11:35.481742+00
a84b140e-073d-4dd5-bf1c-6de1ffc2328b	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	143a5beb-1342-40f7-b9ef-3431b4c44da4	nguyentuandat	\N	f	2026-01-22 02:13:00.146588+00
01571252-b5bb-411f-b157-424e9d27d83e	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	143a5beb-1342-40f7-b9ef-3431b4c44da4	nguyentuandat	\N	f	2026-01-22 02:13:03.086725+00
81d5859b-9349-4d93-a897-732a67f89a0e	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/143a5beb-1342-40f7-b9ef-3431b4c44da4	143a5beb-1342-40f7-b9ef-3431b4c44da4	nguyentuandat	\N	f	2026-01-22 02:13:06.839461+00
d76960b7-58d2-4ce7-bda2-4a1b745b0901	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	143a5beb-1342-40f7-b9ef-3431b4c44da4	nguyentuandat	\N	f	2026-01-22 02:13:12.00951+00
959c8e4c-ad24-41f0-b864-90241c830d22	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	143a5beb-1342-40f7-b9ef-3431b4c44da4	nguyentuandat	\N	f	2026-01-22 02:13:13.312978+00
02ab8d93-470b-42ec-bafe-11d86691300d	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	3f43944a-64de-489a-aac4-7564b6367304	hominhkhang	\N	f	2026-01-22 02:14:11.141679+00
2c38d32d-4099-449a-81c7-6917ba754124	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	3f43944a-64de-489a-aac4-7564b6367304	hominhkhang	\N	f	2026-01-22 02:14:14.169772+00
a1de9b9c-276d-4afc-a703-9519d0609bf7	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	3f43944a-64de-489a-aac4-7564b6367304	hominhkhang	\N	f	2026-01-22 02:14:15.983057+00
3e642cd5-81d4-4933-ad9d-cc755cf0b28b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	3f43944a-64de-489a-aac4-7564b6367304	hominhkhang	\N	f	2026-01-22 02:14:20.079912+00
6b6dc889-a1ab-41cb-a527-4173768099af	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	3f43944a-64de-489a-aac4-7564b6367304	hominhkhang	\N	f	2026-01-22 02:14:21.505168+00
0e460e4f-5018-4f59-805c-ffcd956bd48b	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/3f43944a-64de-489a-aac4-7564b6367304	3f43944a-64de-489a-aac4-7564b6367304	hominhkhang	\N	f	2026-01-22 02:14:27.28813+00
467b8c68-8956-4967-a4ee-cb8729ecb4a5	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	nguyendinhhiep	\N	f	2026-01-22 02:15:19.89106+00
1e938296-77b4-4b5b-a01a-72acc1fd3ff5	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	nguyendinhhiep	\N	f	2026-01-22 02:15:22.818128+00
e6a4d976-7ee6-4a94-bc68-8af9c9ab0607	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	nguyendinhhiep	\N	f	2026-01-22 02:15:24.131853+00
4d40f0c8-bca0-4dc4-ac08-a714284b9702	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/5e6a591b-bf61-46aa-9502-9f9baaa0cc93	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	nguyendinhhiep	\N	f	2026-01-22 02:15:30.420983+00
7e65af3e-2612-46cd-a3a3-c93da109c1c3	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	9a92b411-973c-485e-9572-541a3989be22	nguyenthanhdat	\N	f	2026-01-22 02:16:23.070768+00
e3b8721d-b983-40d7-a379-838861ed6f31	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9a92b411-973c-485e-9572-541a3989be22	nguyenthanhdat	\N	f	2026-01-22 02:16:37.529225+00
ca2c64b5-c701-47e4-86b6-4d992664c55d	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9a92b411-973c-485e-9572-541a3989be22	nguyenthanhdat	\N	f	2026-01-22 02:16:38.795073+00
627f4b76-4b13-40bf-a697-350d000db289	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/9a92b411-973c-485e-9572-541a3989be22	9a92b411-973c-485e-9572-541a3989be22	nguyenthanhdat	\N	f	2026-01-22 02:16:43.497131+00
fe4b215a-d848-4fe0-a32b-d557250aed90	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	nguyendinhhuy	\N	f	2026-01-22 02:17:44.107621+00
feeac751-18aa-44dd-91fc-c55e3e8365b4	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	nguyendinhhuy	\N	f	2026-01-22 02:17:45.213261+00
78769d80-a1c2-4f27-84fd-644e1d594be3	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	nguyendinhhuy	\N	f	2026-01-22 02:17:50.524997+00
5398e0d8-4fa1-472a-a3e8-04b8bc7f5121	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	nguyendinhhuy	\N	f	2026-01-22 02:17:53.043546+00
1f8ecc4d-96e4-47ec-9a5f-f72418760cbb	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	nguyendinhhuy	\N	f	2026-01-22 02:17:54.380088+00
3465b3c7-f6e4-4483-aeca-39ac7508b53c	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	vohoangtuanhai	\N	f	2026-01-22 02:19:02.060161+00
f2ff2cce-c80b-40f3-9714-26b4261648de	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	vohoangtuanhai	\N	f	2026-01-22 02:19:05.205696+00
28a14590-c3ee-45db-a1f1-afb16978abf7	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/27cdf08b-ca0b-45a6-99c7-34e2927dea2d	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	vohoangtuanhai	\N	f	2026-01-22 02:19:08.768859+00
bd3eb59b-a13d-4613-983f-ce33dd92334e	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	a3f52365-5616-4ae8-8b9d-dfba52c94270	hotrongphuc	\N	f	2026-01-22 02:20:12.76977+00
18f56830-9e25-4d7d-98a3-92174a415a91	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	a3f52365-5616-4ae8-8b9d-dfba52c94270	hotrongphuc	\N	f	2026-01-22 02:20:14.536068+00
96bc9d2b-6998-4dba-a954-5a066b726ba6	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	a3f52365-5616-4ae8-8b9d-dfba52c94270	hotrongphuc	\N	f	2026-01-22 02:20:16.27432+00
e9c566a9-2882-4b93-a5d4-c063a3189d12	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	37868e58-66d7-4803-a276-eb6da072b972	phamthiphuongnam	\N	f	2026-01-22 02:21:48.388137+00
63543f46-91be-4294-b8b9-873a9b58aa4f	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	37868e58-66d7-4803-a276-eb6da072b972	phamthiphuongnam	\N	f	2026-01-22 02:21:50.838762+00
58513a18-4eab-4fca-9e82-e3cbc04c608a	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	37868e58-66d7-4803-a276-eb6da072b972	phamthiphuongnam	\N	f	2026-01-22 02:21:53.905226+00
4d378150-b906-435d-a857-f8e8906e03e3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	37868e58-66d7-4803-a276-eb6da072b972	phamthiphuongnam	\N	f	2026-01-22 02:21:55.531055+00
1339d014-1820-4b51-b10a-3b4ead669749	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	hatrannhaky	\N	f	2026-01-22 02:23:53.064448+00
976792b7-a42b-4f2e-b771-351cf8108c18	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	hatrannhaky	\N	f	2026-01-22 02:23:53.07642+00
528f3716-2997-407d-a8a3-952c9220bd64	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	hatrannhaky	\N	f	2026-01-22 02:23:55.332607+00
f5397f2b-dc04-4a37-9e6b-815403912b11	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	hatrannhaky	\N	f	2026-01-22 02:23:55.567902+00
5f8e2961-e360-4a43-a045-f1f836544241	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	hatrannhaky	\N	f	2026-01-22 02:24:02.308626+00
e5bb5f81-7494-4e46-89f9-7325017d7cc3	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:25:17.421502+00
0e241842-1c45-40d3-b270-f1cd17d742cc	1c1df301-da2b-4ed7-aa41-bf216a66d009	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập "	/posts/5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:25:19.830244+00
50e6ae5a-fd03-4746-8f15-fec285d9763a	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:25:22.261134+00
69147375-a9d6-4f70-9d49-d8aadc68e133	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:25:23.90822+00
67db4cd0-03de-4b16-acdc-e3462e1f9583	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:25:26.41063+00
4cb17e77-0298-402c-acab-f848403d2cfb	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:25:28.049079+00
e5b0408a-0e0a-4c08-a181-54715ce77b34	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/f404aa02-8c39-4c40-850e-f7f13b9a2adb	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:25:32.423049+00
42401f6b-bd55-43e5-8e25-7cea4dc75c4e	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/f404aa02-8c39-4c40-850e-f7f13b9a2adb	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:25:48.721636+00
c0fdb992-9ae0-42f9-80a0-442647c7c427	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	\N	f	2026-01-22 02:34:04.914858+00
9ae3f8cb-5c6f-4c5d-8fa1-941dcb5598c1	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	leduonganhkhoa	\N	f	2026-01-22 03:09:09.387403+00
1681d6fc-960b-45ac-8a1d-5598c98e0b1a	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	leduonganhkhoa	\N	f	2026-01-22 03:09:13.25091+00
67611906-36c3-44f4-8d28-be92f06e09ee	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/eb7de62b-d4c8-4e76-a75e-b32af563a4c0	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	leduonganhkhoa	\N	f	2026-01-22 03:09:16.995986+00
ec5335b9-4551-4902-8cbf-4a0f932f54a3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	44d5783f-4535-4541-bb10-efcf81eec4a3	nguyentandat	\N	f	2026-01-22 03:10:40.722488+00
457b94a9-a43d-4169-bcaf-6495f92fd7da	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	44d5783f-4535-4541-bb10-efcf81eec4a3	nguyentandat	\N	f	2026-01-22 03:10:43.103852+00
64a1e632-b255-4bf3-aa61-377227957dcf	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4104824d-4aaa-4ce4-b304-d1074d61fba6	dangngochoangthanh	\N	f	2026-01-22 03:12:09.400093+00
19e8c513-a668-4758-9986-64d5583c8d39	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4104824d-4aaa-4ce4-b304-d1074d61fba6	dangngochoangthanh	\N	f	2026-01-22 03:12:11.059414+00
74b0a00a-379e-46de-800d-e1b55b3c3f68	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/4104824d-4aaa-4ce4-b304-d1074d61fba6	4104824d-4aaa-4ce4-b304-d1074d61fba6	dangngochoangthanh	\N	f	2026-01-22 03:12:20.462951+00
061f9436-9094-440d-bf27-f8221bb71acb	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	lyminhdat	\N	f	2026-01-22 03:13:21.127825+00
68d077ec-f574-4a63-b40d-ac0d70dac5e9	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "kinh nghiệm trồng hành lá"	/posts/d7fcc921-43fc-4970-a35e-de2688db45a4	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	lyminhdat	\N	f	2026-01-22 03:13:25.858931+00
9ef2c3e5-2ab6-4a9a-9f2d-f711cc0a9069	71db8ee9-f2ce-4548-bf96-dc4dea252445	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Cách phòng chống xâm nhập mặn"	/posts/47cc8d25-a2f9-4cc8-92a7-cf7f18e83e38	6fb4e6fd-e573-4551-8480-91aaa0d63b80	tranduy	\N	t	2026-01-22 03:15:12.754267+00
451a834e-6372-4273-8383-aea279f28fd1	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	lyminhdat	\N	f	2026-01-22 03:13:44.251494+00
1f7af799-12c9-4e3a-81f4-b26ea2e4bd7b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	lyminhdat	\N	f	2026-01-22 03:13:45.884441+00
aaf02e55-b4e1-4fac-9aa8-5a10581e40c7	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/dbda9c37-7eac-4e1e-9c74-bd66e80bb924	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	lyminhdat	\N	f	2026-01-22 03:13:50.679733+00
20a3a80d-04b5-43e6-9942-b7e04519b53e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	6fb4e6fd-e573-4551-8480-91aaa0d63b80	tranduy	\N	f	2026-01-22 03:14:49.976759+00
08d89c1f-8b8b-472d-abfb-905af686166e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	6fb4e6fd-e573-4551-8480-91aaa0d63b80	tranduy	\N	f	2026-01-22 03:14:51.034929+00
f7d3ce0b-2787-4561-bb10-efeacde6049e	e977b62e-005f-4c17-9384-1f9a6283ca02	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói "	/posts/e6b29f58-e106-46c6-9eab-a1c2f119493b	6fb4e6fd-e573-4551-8480-91aaa0d63b80	tranduy	\N	f	2026-01-22 03:15:29.179181+00
8f22c9a8-0487-41d6-91f4-b8d74c4da383	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/6fb4e6fd-e573-4551-8480-91aaa0d63b80	6fb4e6fd-e573-4551-8480-91aaa0d63b80	tranduy	\N	f	2026-01-22 03:15:56.225036+00
16365734-df0a-41de-b578-1e79255b15cb	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	6d277ecb-1abf-4361-b0c3-0948f3b8d234	nguyenquynhnghi	\N	f	2026-01-22 03:17:01.145854+00
9ca2a087-6966-4def-8a5b-4d977249ae13	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	6d277ecb-1abf-4361-b0c3-0948f3b8d234	nguyenquynhnghi	\N	f	2026-01-22 03:17:04.146154+00
b860082b-6813-4a38-a0e4-16bf91464c9f	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	6d277ecb-1abf-4361-b0c3-0948f3b8d234	nguyenquynhnghi	\N	f	2026-01-22 03:17:06.625403+00
ea6ebffd-8591-425b-8e06-4231ad1037df	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/6d277ecb-1abf-4361-b0c3-0948f3b8d234	6d277ecb-1abf-4361-b0c3-0948f3b8d234	nguyenquynhnghi	\N	f	2026-01-22 03:17:12.041799+00
01f00c5a-68a1-4591-87ff-c3c3b8493f55	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	7646b385-d2e4-4b95-acc5-c816e3cd1412	nguyenminhtam	\N	f	2026-01-22 03:18:45.265921+00
3fadfe1d-bf65-41bd-ab4a-9cb962b5218d	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	7646b385-d2e4-4b95-acc5-c816e3cd1412	nguyenminhtam	\N	f	2026-01-22 03:18:46.616545+00
3a588cb4-f604-4714-98ee-370d982146a9	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/7646b385-d2e4-4b95-acc5-c816e3cd1412	7646b385-d2e4-4b95-acc5-c816e3cd1412	nguyenminhtam	\N	f	2026-01-22 03:18:53.099407+00
c649906a-14df-4bda-9164-5f530dfe075d	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	phamngulao	\N	f	2026-01-22 03:19:59.408227+00
eb49dc8e-310c-47b3-bf04-07c99086f267	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	phamngulao	\N	f	2026-01-22 03:20:00.676565+00
5d930a82-8f99-4d6b-9001-c2514fec387e	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	phamngulao	\N	f	2026-01-22 03:20:18.929188+00
5a6ed6f8-480a-4724-b534-edd584af3712	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	35dca33b-9d87-448c-80f5-a93eb0940c7f	tranthikimtuyen	\N	f	2026-01-22 03:22:52.23563+00
d18383a8-7d33-4ef7-a775-56d95e812519	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	35dca33b-9d87-448c-80f5-a93eb0940c7f	tranthikimtuyen	\N	f	2026-01-22 03:22:56.076517+00
07254b5b-57dc-43f5-ab4c-7f46dc0d4ab5	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	35dca33b-9d87-448c-80f5-a93eb0940c7f	tranthikimtuyen	\N	f	2026-01-22 03:22:57.547275+00
bef0046f-830f-47ef-adb9-da10ed9a02e0	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/35dca33b-9d87-448c-80f5-a93eb0940c7f	35dca33b-9d87-448c-80f5-a93eb0940c7f	tranthikimtuyen	\N	f	2026-01-22 03:23:11.351245+00
414da587-ef73-48fa-9891-ec8b43ccfab7	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	9ec8512b-24ba-4581-a362-6f7a3a6c0235	vodoanhoanglong	\N	f	2026-01-22 03:24:10.412983+00
bbbe3627-e808-4d60-ac75-19c9200ada8d	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9ec8512b-24ba-4581-a362-6f7a3a6c0235	vodoanhoanglong	\N	f	2026-01-22 03:24:12.511142+00
19e9680a-a900-4700-90ec-801510d0daca	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	9ec8512b-24ba-4581-a362-6f7a3a6c0235	vodoanhoanglong	\N	f	2026-01-22 03:24:13.874559+00
84647f93-0665-413a-92a4-887a16eac413	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/9ec8512b-24ba-4581-a362-6f7a3a6c0235	9ec8512b-24ba-4581-a362-6f7a3a6c0235	vodoanhoanglong	\N	f	2026-01-22 03:24:19.126084+00
13418416-d5c0-47ea-8c50-759502498c58	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	phamquynhanhly	\N	f	2026-01-22 03:26:38.646176+00
97009b8e-f87c-4db2-868d-28904fc46244	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	phamquynhanhly	\N	f	2026-01-22 03:27:27.298009+00
9db68836-7191-4fee-8ce2-30add82b6970	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	phamquynhanhly	\N	f	2026-01-22 03:27:29.289188+00
6b07182e-263d-43f1-8d49-65fb009cef9b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e15551b8-af10-46c7-b62e-b6736ca520cb	vonguyenngocha	\N	f	2026-01-22 03:29:37.596456+00
988e0a51-68a3-46e3-b698-92140a480d9b	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	e15551b8-af10-46c7-b62e-b6736ca520cb	vonguyenngocha	\N	f	2026-01-22 03:29:40.048187+00
a5469e78-3bbe-4817-bd65-b187140c17e3	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/e15551b8-af10-46c7-b62e-b6736ca520cb	e15551b8-af10-46c7-b62e-b6736ca520cb	vonguyenngocha	\N	f	2026-01-22 03:29:45.260655+00
596c86b8-51c4-44cb-a1b4-df3c2a113060	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "Giải pháp Dinh dưỡng & Phân bón (Tăng sức đề kháng"	/posts/ced2daff-f7af-41dc-bdc8-0f53c7a5e6d1	88818637-080c-4c99-ae7d-265f4f7ada85	lamnguyentannam	\N	f	2026-01-22 03:30:48.363219+00
cf7e69df-26fc-4b14-967c-26926056cf85	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	88818637-080c-4c99-ae7d-265f4f7ada85	lamnguyentannam	\N	f	2026-01-22 03:31:23.871125+00
29ab555b-26fd-4b3d-a67f-c0a9957f3be3	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	88818637-080c-4c99-ae7d-265f4f7ada85	lamnguyentannam	\N	f	2026-01-22 03:31:29.54796+00
c2684267-3f59-4a35-9280-41bacfd678ec	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	POST_LIKE	Thích bài viết	đã thích bài viết của bạn: "[UEH][AR0001][THAM QUANG DOANH NGHIỆP]"	/posts/535b8da2-0d19-4b84-9eb3-e59ee5a286c1	88818637-080c-4c99-ae7d-265f4f7ada85	lamnguyentannam	\N	f	2026-01-22 03:31:49.094865+00
0c84d629-f8b4-4217-bc93-1a3922c06570	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	8ab57ed4-2107-4880-88a5-93e07bc747d0	truonghoanganh	\N	f	2026-01-22 03:33:06.304521+00
2b185562-26a1-4118-8869-a23db03b77d1	6c45203b-a5ff-4f1c-be40-6bce6188f757	FOLLOW	Người theo dõi mới	đã bắt đầu theo dõi bạn	/profile/8ab57ed4-2107-4880-88a5-93e07bc747d0	8ab57ed4-2107-4880-88a5-93e07bc747d0	truonghoanganh	\N	f	2026-01-22 03:33:11.390465+00
5368a0f7-8ee6-4481-9246-5d214e77b94d	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	bc2344f4-66d6-4dcf-93fa-608871aeb1ba	lieuthilanh	\N	f	2026-01-22 03:49:21.943493+00
754b3431-eb7d-4314-b571-15f187166e91	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	dca20759-c2ff-496d-8d55-dd9230f92203	nguyentankhim	\N	f	2026-01-22 03:51:05.163756+00
ab4b9d17-5084-4135-a4b0-97dc6c5d431a	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	24704bb6-2908-44a7-8098-4a188b527805	nguyenthitrucloan	\N	f	2026-01-22 03:53:26.901824+00
13c39406-3eca-4313-a064-cf50a4296e9c	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	d8aa2361-6122-40a3-9ae2-93792e236825	truongthanhcong	\N	f	2026-01-22 03:54:15.724199+00
b42b9573-17de-4661-a7ea-0f8f7c225e0e	6c45203b-a5ff-4f1c-be40-6bce6188f757	POST_SHARE	Chia sẻ bài viết	đã chia sẻ bài viết của bạn: "NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN N"	/posts/28c62465-f2c9-4653-adae-0918420f06a3	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	nguyenthanhcong	\N	f	2026-01-22 03:56:57.538044+00
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organizations (id, name, description, phone_number, email, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: password_reset_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_codes (id, user_id, code, phone_number, expires_at, used, created_at) FROM stdin;
e3a1449b-95a8-42c6-9916-53c215e51aa8	37f5ce8a-f218-4ec7-87d0-52967b78be4e	063242	+84399746611	2026-01-02 06:41:31.235205+00	t	2026-01-02 06:26:31.235205+00
8b8351e3-3ada-4421-912d-0f612aefa58d	b1294c8d-cc65-480c-92ff-0e23cd927b59	322700	+84399746618	2026-01-02 06:45:17.872246+00	t	2026-01-02 06:30:17.872246+00
09f8ce1c-d8df-4155-ae32-a042615cb9e9	b1294c8d-cc65-480c-92ff-0e23cd927b59	019124	+84399746618	2026-01-02 07:15:32.11531+00	f	2026-01-02 07:00:32.11531+00
832f4331-6690-4d38-8bfb-5850dac24720	b1294c8d-cc65-480c-92ff-0e23cd927b59	530311	+84399746618	2026-01-02 07:18:07.473518+00	f	2026-01-02 07:03:07.473518+00
79d7da0b-30a7-491a-a01e-525dde86a4b0	f5e5fb6a-699c-4785-b339-8ebfeb89f890	360880	+84399746612	2026-01-11 04:18:36.593851+00	f	2026-01-11 04:03:36.593851+00
abccc439-8ed8-4a75-9136-7cb74c9d5e0f	f5e5fb6a-699c-4785-b339-8ebfeb89f890	552554	+84399746612	2026-01-16 11:42:35.47344+00	t	2026-01-16 11:27:35.47344+00
df0ddea2-e51d-4164-b432-ff0bf385d6a0	f5e5fb6a-699c-4785-b339-8ebfeb89f890	438691	+84399746612	2026-01-16 11:43:35.662418+00	t	2026-01-16 11:28:35.662418+00
b2aeaa88-3d6d-4363-8f75-9cac24929353	f5e5fb6a-699c-4785-b339-8ebfeb89f890	460252	+84399746612	2026-01-16 11:47:39.636162+00	t	2026-01-16 11:32:39.636162+00
e280d631-bb7e-47c5-97a1-7b3ea79ff569	b1294c8d-cc65-480c-92ff-0e23cd927b59	190439	+84399746618	2026-01-16 11:50:03.633353+00	t	2026-01-16 11:35:03.633353+00
8a58aa17-9f89-4765-baee-96d8fc46bf87	b1294c8d-cc65-480c-92ff-0e23cd927b59	390311	+84399746618	2026-01-16 11:51:35.250592+00	t	2026-01-16 11:36:35.250592+00
ab9f3cbf-e786-4839-a9ad-648ca65123c4	b1294c8d-cc65-480c-92ff-0e23cd927b59	864552	+84399746618	2026-01-16 11:53:06.095948+00	t	2026-01-16 11:38:06.095948+00
df44e70d-e4d9-4e31-b1c4-b6d300f27943	b1294c8d-cc65-480c-92ff-0e23cd927b59	876484	+84399746618	2026-01-16 11:53:56.769036+00	t	2026-01-16 11:38:56.769036+00
70bd0552-c531-424a-8120-cfada206b97a	b1294c8d-cc65-480c-92ff-0e23cd927b59	436219	+84399746618	2026-01-16 11:57:55.887047+00	t	2026-01-16 11:42:55.887047+00
aef1e9e4-e3a8-4f4a-9609-efadf511c2fe	f5e5fb6a-699c-4785-b339-8ebfeb89f890	324308	+84399746612	2026-01-16 14:58:38.579764+00	t	2026-01-16 14:43:38.579764+00
49d85f60-142e-4a07-b23e-255e506ee5af	f5e5fb6a-699c-4785-b339-8ebfeb89f890	940231	+84399746612	2026-01-16 15:00:46.920493+00	t	2026-01-16 14:45:46.920493+00
c0d86c00-9a7d-409c-ab30-a58f4f9d2f84	b1294c8d-cc65-480c-92ff-0e23cd927b59	522366	+84399746618	2026-01-16 15:11:54.124391+00	t	2026-01-16 14:56:54.124391+00
bac087a2-9cbf-4d26-bd82-cbbfa206da99	b1294c8d-cc65-480c-92ff-0e23cd927b59	772149	+84399746618	2026-01-16 15:16:33.952072+00	t	2026-01-16 15:01:33.952072+00
310d6cf3-2760-45c9-a4bb-a41df133ccda	b1294c8d-cc65-480c-92ff-0e23cd927b59	067100	+84399746618	2026-01-16 15:19:33.126093+00	t	2026-01-16 15:04:33.126093+00
458294e8-c910-4910-854a-cc75881e5787	b1294c8d-cc65-480c-92ff-0e23cd927b59	743635	+84399746618	2026-01-16 15:20:23.863405+00	t	2026-01-16 15:05:23.863405+00
32262edd-465b-4926-9ea4-293be0c7ed08	f5e5fb6a-699c-4785-b339-8ebfeb89f890	608598	+84399746612	2026-01-16 15:22:26.892992+00	t	2026-01-16 15:07:26.892992+00
d47b9c9d-5c01-42e4-8bfa-c465c85392f1	f5e5fb6a-699c-4785-b339-8ebfeb89f890	834670	+84399746612	2026-01-16 15:26:51.752124+00	t	2026-01-16 15:11:51.752124+00
65ba1594-3c5c-40fd-ba40-94b9bb90b697	691cc91c-15d6-462b-a4dd-ebb24574b096	719723	+84399746619	2026-01-16 15:30:41.330456+00	t	2026-01-16 15:15:41.330456+00
77ba8595-3297-4b74-8cfe-1dd3798ca65a	691cc91c-15d6-462b-a4dd-ebb24574b096	283579	+84399746619	2026-01-16 15:35:17.010921+00	t	2026-01-16 15:20:17.010921+00
16f88f69-4ae3-43d2-9716-88429c54061c	1993de5f-2df4-4232-bdaf-96681211700f	450736	+84399746615	2026-01-16 15:37:09.510224+00	t	2026-01-16 15:22:09.510224+00
3eaa7abf-109f-4969-8dfe-c1186e1036be	f9f33aad-0efb-4893-b8f4-3c4688f1b354	276469	+84585708372	2026-01-18 11:50:25.489982+00	f	2026-01-18 11:35:25.489982+00
7a256106-d521-4b95-93ff-66c41e6dedf7	f9f33aad-0efb-4893-b8f4-3c4688f1b354	105536	+84585708372	2026-01-18 11:51:17.298201+00	f	2026-01-18 11:36:17.298201+00
c0f46c9c-8140-41ab-896f-aa1efc12370f	f9f33aad-0efb-4893-b8f4-3c4688f1b354	582688	+84585708372	2026-01-18 11:51:34.758339+00	f	2026-01-18 11:36:34.758339+00
6940fcb5-8ee8-43f8-95d0-e0a472ac44df	37f5ce8a-f218-4ec7-87d0-52967b78be4e	659858	+84399746611	2026-01-19 16:37:17.764047+00	t	2026-01-19 16:22:17.764047+00
\.


--
-- Data for Name: payment_installments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_installments (id, transaction_id, receivable_id, installment_number, total_installments, amount, paid_amount, due_date, status, paid_at, payment_reference, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_transactions (id, transaction_code, type, status, buyer_id, seller_id, product_id, amount, discount_amount, tax_amount, final_amount, payment_method, payment_provider, payment_reference, credit_term_days, due_date, interest_rate, late_fee_rate, paid_amount, remaining_amount, notes, metadata, created_at, updated_at, completed_at, cancelled_at, verification_document_id) FROM stdin;
0adea744-c875-4624-a48f-4563906dcb90	TXN202601251585	immediate	processing	6c45203b-a5ff-4f1c-be40-6bce6188f757	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-01-25 03:49:19.086285+00	2026-01-25 03:49:19.086285+00	\N	\N	\N
0fb8d081-2936-4659-a8ec-830c520e6767	TXN202601258931	immediate	processing	6c45203b-a5ff-4f1c-be40-6bce6188f757	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	239099.00	0.00	0.00	239099.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	239099.00	\N	{}	2026-01-25 02:04:02.89824+00	2026-01-25 03:58:44.018966+00	\N	\N	\N
301abf03-f4a3-408f-80b6-6445a575cbbd	TXN202601257407	immediate	processing	6c45203b-a5ff-4f1c-be40-6bce6188f757	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	10000000.00	0.00	0.00	10000000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	10000000.00	\N	{}	2026-01-25 03:35:59.650221+00	2026-01-25 03:58:51.697431+00	\N	\N	\N
981a315f-ff49-46f1-9711-5f4952371d98	TXN202601244747	credit	pending	4ee915ec-4c50-4adf-9650-ea4ee740210f	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	10000000.00	0.00	0.00	10000000.00	credit	\N	\N	30	2026-02-23 03:33:28.145+00	0.00	0.00	0.00	10000000.00	\N	{}	2026-01-24 03:33:28.294434+00	2026-01-25 03:58:51.697431+00	\N	\N	\N
ab89873a-c3b5-4111-9fef-f34c392bb334	TXN202601244610	immediate	completed	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	10000000.00	0.00	0.00	10000000.00	bank_transfer	VietQR	QR-1769237998385	\N	\N	0.00	0.00	10000000.00	0.00	\N	{}	2026-01-24 06:59:45.248369+00	2026-01-25 03:58:51.697431+00	2026-01-24 06:59:59.027+00	\N	\N
7252bafa-33a3-49d6-852e-f7e561bf4f15	TXN202601241307	credit	pending	37f5ce8a-f218-4ec7-87d0-52967b78be4e	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	10000000.00	0.00	0.00	10000000.00	credit	\N	\N	30	2026-02-23 18:20:11.142+00	0.00	0.00	0.00	10000000.00	\N	{}	2026-01-24 18:20:12.281593+00	2026-01-25 03:58:51.697431+00	\N	\N	\N
acf6cd78-99b1-4c0a-960f-ddab2de259b6	TXN202601248143	immediate	processing	6c45203b-a5ff-4f1c-be40-6bce6188f757	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	10000000.00	0.00	0.00	10000000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	10000000.00	\N	{}	2026-01-24 23:49:03.591972+00	2026-01-25 03:58:51.697431+00	\N	\N	\N
67e742c2-56e8-4346-a3fd-d60e229f61bf	TXN202601246985	immediate	processing	4ee915ec-4c50-4adf-9650-ea4ee740210f	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	10000000.00	0.00	0.00	10000000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	10000000.00	\N	{}	2026-01-24 03:31:31.535906+00	2026-01-25 03:58:57.316773+00	\N	\N	\N
e7aa63d4-e378-4143-ab0f-f665ba044bcb	TXN202601249772	immediate	processing	6c45203b-a5ff-4f1c-be40-6bce6188f757	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	10000000.00	0.00	0.00	10000000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	10000000.00	\N	{}	2026-01-24 07:57:05.011037+00	2026-01-25 03:58:57.316773+00	\N	\N	\N
0354ea56-a6ce-4292-b646-5ebcfa399bf3	TXN202601241723	immediate	processing	6c45203b-a5ff-4f1c-be40-6bce6188f757	ca24214f-9f3f-40f2-8c59-900f3124c5c8	\N	10000000.00	0.00	0.00	10000000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	10000000.00	\N	{}	2026-01-24 08:39:51.662952+00	2026-01-25 03:58:57.316773+00	\N	\N	\N
70fb8e42-87c6-461d-8db4-cb5e22c35ab8	TXN202601251324	immediate	processing	5d100834-5494-4217-ac7c-e02053c4f016	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-01-25 04:19:47.373339+00	2026-01-25 04:19:47.373339+00	\N	\N	\N
6d1aa67a-251a-4525-aac2-5093b6caa269	TXN202601254163	immediate	processing	6c45203b-a5ff-4f1c-be40-6bce6188f757	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-01-25 04:28:06.05126+00	2026-01-25 04:28:06.05126+00	\N	\N	\N
9e0d360e-86ea-4438-aecf-45e1cf01e41c	TXN202603132284	immediate	completed	55cc2f62-282e-455d-8d90-675dae449f45	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1773411739648	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-03-13 14:21:41.602185+00	2026-03-13 14:22:21.418094+00	2026-03-13 14:22:21.26+00	\N	\N
a9d7f71f-106c-4f4a-b968-e1ea4bde51af	TXN202603252968	immediate	completed	9d0ef483-3495-446e-a744-f290c1e4d509	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1774435788729	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-03-25 10:48:46.322077+00	2026-03-25 10:49:50.297538+00	2026-03-25 10:49:49.513+00	\N	\N
12161b3f-c8f3-43bf-8ed9-68411bc08d90	TXN202603255076	immediate	processing	2374dd2e-e380-45d4-a350-bedbaae40ad0	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-03-25 19:23:18.766944+00	2026-03-25 19:23:18.766944+00	\N	\N	\N
fe9636d6-7ede-42df-888b-71df47b96b34	TXN202603253950	immediate	processing	2374dd2e-e380-45d4-a350-bedbaae40ad0	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-03-25 19:24:15.610618+00	2026-03-25 19:24:15.610618+00	\N	\N	\N
6cfc1a57-c661-4a15-854c-6c15291e2e99	TXN202603285363	immediate	processing	2374dd2e-e380-45d4-a350-bedbaae40ad0	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-03-28 02:37:52.345827+00	2026-03-28 02:37:52.345827+00	\N	\N	\N
1b64acfe-43c3-4d22-8ff9-d52267967c56	TXN202603308887	immediate	processing	37f5ce8a-f218-4ec7-87d0-52967b78be4e	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-03-30 05:34:14.401507+00	2026-03-30 05:34:14.401507+00	\N	\N	\N
968f1bf6-c3fe-4f2a-a8a8-391a3bc6624c	TXN202603308971	immediate	processing	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-03-30 10:08:07.910706+00	2026-03-30 10:08:07.910706+00	\N	\N	\N
3c15b2e1-9012-4a2e-9f8c-7a7789e3df75	TXN202604027011	immediate	processing	37f5ce8a-f218-4ec7-87d0-52967b78be4e	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-04-02 12:02:29.382802+00	2026-04-02 12:02:29.382802+00	\N	\N	\N
f5335e80-d064-4f0b-abb0-ed56df962e88	TXN202604046484	immediate	processing	660e5db2-b63a-4a80-9e03-61b9676a25f0	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-04-04 14:10:55.155907+00	2026-04-04 14:10:55.155907+00	\N	\N	\N
8be9c7f0-0713-4a1f-b262-8e3cb7c9b9f4	TXN202604060094	immediate	processing	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-04-06 17:37:25.180529+00	2026-04-06 17:37:25.180529+00	\N	\N	\N
aaac6a25-b3e1-4419-a356-c61413d138d3	TXN202604066420	immediate	processing	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-04-06 17:39:59.109506+00	2026-04-06 17:39:59.109506+00	\N	\N	\N
0693d685-56f7-45ed-861f-ee5898671148	TXN202604076341	immediate	completed	261a6c39-6bc6-4b53-bad9-d8a71b56de92	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	credit_card	VNPay	CARD-1775532005234	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-07 03:20:05.517084+00	2026-04-07 03:20:06.623513+00	2026-04-07 03:20:05.85+00	\N	\N
e204f000-c586-44c3-a965-37d7092b711f	TXN202604123734	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775957482000	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 01:31:17.282442+00	2026-04-12 01:31:22.559581+00	2026-04-12 01:31:22.418+00	\N	\N
b0756106-57c8-4382-b2a4-5a9fbfa3372f	TXN202604129912	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775959676015	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 02:07:55.052929+00	2026-04-12 02:07:56.641524+00	2026-04-12 02:07:56.468+00	\N	\N
f5529f53-ff77-4658-a1f1-c67e961fe3fb	TXN202604125175	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775960318150	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 02:18:36.340617+00	2026-04-12 02:18:38.733759+00	2026-04-12 02:18:38.553+00	\N	\N
80ccd2b3-543b-4896-8c39-400f41b439d4	TXN202604125327	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775960332671	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 02:18:52.122735+00	2026-04-12 02:18:53.230495+00	2026-04-12 02:18:53.059+00	\N	\N
04471a16-1c3a-4037-b605-5ef74df081f7	TXN202604126259	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775961591806	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 02:39:50.548573+00	2026-04-12 02:39:52.444826+00	2026-04-12 02:39:52.252+00	\N	\N
51a0eb26-3724-4c9d-8d7a-00e67561ed5d	TXN202604124618	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775965103061	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 03:38:18.734424+00	2026-04-12 03:38:23.753175+00	2026-04-12 03:38:23.521+00	\N	\N
3762c26a-5a3d-49ba-999d-2f4ecac42c4b	TXN202604126173	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775965362276	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 03:42:41.305118+00	2026-04-12 03:42:42.979051+00	2026-04-12 03:42:42.734+00	\N	\N
4b5c68f0-8e72-4ef8-b3c9-14caa361ef62	TXN202604128169	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775965602364	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 03:46:41.604071+00	2026-04-12 03:46:42.980119+00	2026-04-12 03:46:42.756+00	\N	\N
85112676-f4a7-495a-9b0b-6349614ef21e	TXN202604123641	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775965944300	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 03:52:21.338236+00	2026-04-12 03:52:24.94625+00	2026-04-12 03:52:24.713+00	\N	\N
209b80a0-3544-4895-ad24-1a8041cafe07	TXN202604129270	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775969532651	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 04:52:08.926745+00	2026-04-12 04:52:13.35192+00	2026-04-12 04:52:13.069+00	\N	\N
f378b4b9-f8e8-49e3-a61c-6cce65081998	TXN202604126082	immediate	completed	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1775976182894	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-04-12 06:43:02.145279+00	2026-04-12 06:43:03.679515+00	2026-04-12 06:43:03.311+00	\N	\N
c3053194-ad53-483e-9191-7ff49561961b	TXN202606099447	immediate	processing	6c45203b-a5ff-4f1c-be40-6bce6188f757	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-06-09 15:09:54.172803+00	2026-06-09 15:09:54.172803+00	\N	\N	\N
aef901b5-c193-442d-b4a2-d37501966bd9	TXN202606140013	immediate	processing	5d100834-5494-4217-ac7c-e02053c4f016	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-06-14 07:56:06.705054+00	2026-06-14 07:56:06.705054+00	\N	\N	\N
48922efc-88bc-4baa-8cb5-267ce6895e27	TXN202609029634	immediate	completed	8566b0fd-1c92-4f5e-b468-a0b74bfab795	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	VietQR	QR-1788383670074	\N	\N	0.00	0.00	1200000.00	0.00	\N	{}	2026-09-02 21:14:11.726126+00	2026-09-02 21:14:31.165691+00	2026-09-02 21:14:30.748+00	\N	\N
502d8fd3-74d4-4859-b22b-c0cef86eddc6	TXN202609068558	credit	pending	8e5489ab-5339-4864-aa29-845a32684bdf	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	credit	\N	\N	30	2026-10-06 12:53:16.4+00	0.00	0.00	0.00	1200000.00	\N	{}	2026-09-06 12:53:16.890778+00	2026-09-06 12:53:16.890778+00	\N	\N	\N
95fca87e-7d2c-4c93-bf96-461126713d74	TXN202609063329	immediate	processing	8e5489ab-5339-4864-aa29-845a32684bdf	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-09-06 13:10:01.770161+00	2026-09-06 13:10:01.770161+00	\N	\N	\N
a3db9d75-a765-4353-b6cf-7aae9e6096fc	TXN202609065729	immediate	processing	8e5489ab-5339-4864-aa29-845a32684bdf	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-09-06 14:34:27.219246+00	2026-09-06 14:34:27.219246+00	\N	\N	\N
8fd4fe65-a3f6-43ba-bba6-8a97daf1ab1e	TXN202609073819	immediate	processing	8e5489ab-5339-4864-aa29-845a32684bdf	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	8ef76374-c486-4e2d-811a-0b82ad202333	1200000.00	0.00	0.00	1200000.00	bank_transfer	\N	\N	\N	\N	0.00	0.00	0.00	1200000.00	\N	{}	2026-09-07 02:16:02.997538+00	2026-09-07 02:16:02.997538+00	\N	\N	\N
\.


--
-- Data for Name: post_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_comments (id, post_id, user_id, content, created_at, updated_at, parent_comment_id, reply_count, like_count) FROM stdin;
c728e287-79dc-4323-97da-23c87fd3e875	d41a6dbf-b002-4b46-ac48-f35492f3814d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	Bài viết hay quá	2026-01-13 13:39:32.863859+00	2026-01-13 13:39:32.863859+00	\N	0	0
5762b969-c02e-4ab5-9f4e-27cee6b7e20f	d41a6dbf-b002-4b46-ac48-f35492f3814d	b1294c8d-cc65-480c-92ff-0e23cd927b59	Bài viết hay đấy, hữu ích	2026-01-13 13:48:47.716073+00	2026-01-13 13:48:47.716073+00	\N	0	0
a3005438-e8a6-4426-b90d-5cfaf3f03dd3	28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	ManiFest	2026-01-17 17:52:24.093682+00	2026-01-19 14:37:43.799255+00	\N	0	1
9a156e5f-1723-49e6-93c7-0ff0bd18ccb2	28c62465-f2c9-4653-adae-0918420f06a3	6c45203b-a5ff-4f1c-be40-6bce6188f757	Em chúc mừng anh chị ạ. Cho em xin vía	2026-01-16 08:48:42.06776+00	2026-01-19 14:37:45.09725+00	\N	0	1
e66e107d-5c49-4d71-b166-dce6ed525d72	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	1c1df301-da2b-4ed7-aa41-bf216a66d009	Ý nghĩa và thiết thực lắm nha cả nhà	2026-01-20 06:13:25.849918+00	2026-01-20 06:13:25.849918+00	\N	0	0
0dfc87cf-97cf-4384-af1f-e4bc975753b1	28c62465-f2c9-4653-adae-0918420f06a3	e977b62e-005f-4c17-9384-1f9a6283ca02	Cố lên nha GreenHackers	2026-01-21 07:15:20.491797+00	2026-01-21 07:15:20.491797+00	\N	0	0
569868ce-0acb-44b7-b326-ec1228dd7a8a	28c62465-f2c9-4653-adae-0918420f06a3	06558882-7a10-4b69-b8e0-4fef2684a434	Chúc nhóm sẽ có Tầm trong Cuộc Thi YDCC này nha, Đã có Tâm rồi mà còn Nhân Văn với Bà Con nữa chứ! Chúc các con Thành Công	2026-01-21 07:18:08.319375+00	2026-01-21 07:18:08.319375+00	\N	0	0
6985e13a-ef88-4c98-911e-e7c1f715e983	28c62465-f2c9-4653-adae-0918420f06a3	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	Chúc giải pháp nhóm đưa ra Thành Công nhé	2026-01-21 07:54:15.042898+00	2026-01-21 07:54:15.042898+00	\N	0	0
923f741b-ad18-42d1-a1e7-9e93d23ac093	28c62465-f2c9-4653-adae-0918420f06a3	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	Cố lên nhóm nhaa top5 nhá	2026-01-21 09:04:05.418905+00	2026-01-21 09:04:05.418905+00	\N	0	0
3c6a8155-f746-423b-a031-2e71c8931e82	28c62465-f2c9-4653-adae-0918420f06a3	a49342a7-3158-433b-a256-172b68d1de57	Chúc Team thuận buồm xuôi gió với Giair pháp cho bà con nha	2026-01-21 09:23:30.449276+00	2026-01-21 09:23:30.449276+00	\N	0	0
a048b834-0743-4b9a-93a4-da120a5ff2e6	28c62465-f2c9-4653-adae-0918420f06a3	de671e87-8ed3-480f-a6af-d7707a4b75c9	Chúc GreenHackers của Bà Con Thành Công trong YDCC dịp cận Tết nha!	2026-01-21 09:37:44.952241+00	2026-01-21 09:37:44.952241+00	\N	0	0
dbdfe8a1-9b5b-4949-8d92-57042527f4dc	28c62465-f2c9-4653-adae-0918420f06a3	535c19e9-df3b-46c1-95dc-f93cb3f22afe	Bác chúc Dự án Nhân Văn của Nhóm Thành Công trong YDCC 2026 này nha<>	2026-01-21 09:42:14.144154+00	2026-01-21 09:42:14.144154+00	\N	0	0
72af0a13-789f-49b8-a0c1-c7671f78db74	28c62465-f2c9-4653-adae-0918420f06a3	b7215524-a4d6-4661-a7c3-83643d53bc8d	Ông chúc Dự Án của các Con sẽ được vào mắt xanh của Doanh nghiệp lớn. Cảm ơn tụi con thấu hiểu nổi đau cho Nông Dân	2026-01-21 09:49:44.397064+00	2026-01-21 09:49:44.397064+00	\N	0	0
9bfb2b2b-5279-4a04-82d9-b0be239006d4	e6b29f58-e106-46c6-9eab-a1c2f119493b	8d390cb3-59e1-45c3-93a0-1459b74498a4	Rất bổ ích cho mùa xâm nhập này bạn ạ!	2026-01-22 00:54:15.301108+00	2026-01-22 00:54:15.301108+00	\N	0	0
35027d65-f020-45a6-bc62-e0a5643eeb8b	d41a6dbf-b002-4b46-ac48-f35492f3814d	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	Like	2026-01-22 01:05:56.418976+00	2026-01-22 01:05:56.418976+00	\N	0	0
85468dd6-8d31-4a46-a9ff-50c0b42a4f7a	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	37f5ce8a-f218-4ec7-87d0-52967b78be4e	hay qua	2026-03-12 09:26:21.583455+00	2026-03-12 09:26:21.583455+00	\N	0	0
11d4c8b4-295a-4dfa-8b7a-3106f01d4e90	d41a6dbf-b002-4b46-ac48-f35492f3814d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	Cảm ơn bạn nhiều lắm	2026-01-14 11:51:45.974494+00	2026-04-02 12:11:12.422623+00	\N	0	1
211a0e32-d441-4254-b12d-e4cfe99377d0	d41a6dbf-b002-4b46-ac48-f35492f3814d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	phanchautrinh cảm ơn	2026-04-02 12:11:21.249399+00	2026-04-02 12:11:21.249399+00	299bfa15-2927-4f1c-80aa-93695dbdb355	0	0
299bfa15-2927-4f1c-80aa-93695dbdb355	d41a6dbf-b002-4b46-ac48-f35492f3814d	97d42fa7-76a1-41f1-bedc-90ee426c32bf	Hữu ích cho tôi và bà con vùng đồng bằng sông cửu long	2026-01-21 10:25:13.606904+00	2026-04-02 12:11:21.249399+00	\N	1	1
\.


--
-- Data for Name: post_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_images (id, post_id, image_url, display_order, caption, created_at) FROM stdin;
be8de169-0a85-4a4a-8ef3-85708883b213	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889496184-fsdzvu.png	0	\N	2026-01-20 06:11:38.215145+00
495fe800-9894-4a64-af02-266e2cd1cc7d	e6b29f58-e106-46c6-9eab-a1c2f119493b	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/e977b62e-005f-4c17-9384-1f9a6283ca02/1768978704712-04fnbg.jpg	0	\N	2026-01-21 06:58:25.837237+00
19ee23a9-fb0b-4288-bb2e-5dedcb92a63c	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/e977b62e-005f-4c17-9384-1f9a6283ca02/1768979575534-hqo6sk.png	0	\N	2026-01-21 07:12:57.319124+00
1c58e019-e3db-44ff-8568-2cd3da39c276	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/06558882-7a10-4b69-b8e0-4fef2684a434/1768980393607-eohrng.png	0	\N	2026-01-21 07:26:35.457337+00
d605c204-ad74-4c99-8670-1d936867122e	5133c21a-fcf7-4021-8bcb-448a3586408d	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/2374dd2e-e380-45d4-a350-bedbaae40ad0/1771391236024-b13bh.jpg	0	\N	2026-02-18 05:07:17.334323+00
b729e959-ef19-4c05-8ff2-71e7aafb3116	c785cfc5-aab2-4027-b788-91ebef1e71b1	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/2175a36f-c2d5-431a-9482-04d3bd25e53f/1775130540076-nuycc8.webp	0	\N	2026-04-02 11:49:01.685812+00
cae50e0b-7563-44cc-b9ed-4cfb1ad8befc	dad214d1-eab3-4cb9-b3a9-45de14b2e778	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/2175a36f-c2d5-431a-9482-04d3bd25e53f/1775130606578-9ostce.jpg	0	\N	2026-04-02 11:50:07.696217+00
\.


--
-- Data for Name: post_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_likes (id, post_id, user_id, created_at) FROM stdin;
ca21ce69-12fd-4c78-a6ba-0b4d176b4a61	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-03-25 19:02:05.786038+00
c8eccbdb-a36a-4b28-9a98-85b77d184826	dad214d1-eab3-4cb9-b3a9-45de14b2e778	5d100834-5494-4217-ac7c-e02053c4f016	2026-06-14 07:22:45.315367+00
af55087b-996a-4c3b-8a32-35f324b2146b	d41a6dbf-b002-4b46-ac48-f35492f3814d	b1294c8d-cc65-480c-92ff-0e23cd927b59	2026-01-13 13:48:34.12317+00
6b836a5a-f55a-42c2-bb5d-8a00ed84cd6b	d41a6dbf-b002-4b46-ac48-f35492f3814d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-16 06:35:18.520254+00
c68da32f-5879-4e36-9342-d7b3fba47316	d41a6dbf-b002-4b46-ac48-f35492f3814d	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-16 06:52:12.268357+00
903316ea-5750-481f-858f-2cb7660e6e25	d41a6dbf-b002-4b46-ac48-f35492f3814d	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-01-16 06:52:53.920866+00
250d2edb-3fc8-4516-9faf-379933dbc8c7	28c62465-f2c9-4653-adae-0918420f06a3	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-16 06:58:09.639745+00
0ab88695-e640-41af-a51c-4685c0973215	28c62465-f2c9-4653-adae-0918420f06a3	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-01-16 06:58:34.66027+00
c71774d8-74fe-461b-9e3e-1a4fc4ff4b8c	d41a6dbf-b002-4b46-ac48-f35492f3814d	02f10e79-87fe-4842-8790-97976769f4fa	2026-01-16 09:01:46.123768+00
3a32154d-2628-45d8-b6d2-d34834e23bbc	d41a6dbf-b002-4b46-ac48-f35492f3814d	f5e5fb6a-699c-4785-b339-8ebfeb89f890	2026-01-16 09:05:06.344003+00
a44051a2-12de-4401-9550-57677d947719	28c62465-f2c9-4653-adae-0918420f06a3	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-16 09:45:21.162318+00
2a0ae4d9-fa4b-4052-9203-216fd35800db	28c62465-f2c9-4653-adae-0918420f06a3	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-16 11:25:03.803936+00
723e52e2-9892-4b5d-86a4-19efdec4b001	28c62465-f2c9-4653-adae-0918420f06a3	02f10e79-87fe-4842-8790-97976769f4fa	2026-01-16 11:27:02.887857+00
a844b7ae-caf7-4d82-b3dd-bb626326a1aa	28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	2026-01-17 11:25:43.381201+00
7576a125-1529-43e6-9bfd-b59e17e3b963	28c62465-f2c9-4653-adae-0918420f06a3	9251db17-0835-41c7-8469-28dee88096b1	2026-01-18 12:03:39.266671+00
9545d213-1b8f-45a8-ab69-da224a5c31ba	d41a6dbf-b002-4b46-ac48-f35492f3814d	9251db17-0835-41c7-8469-28dee88096b1	2026-01-18 12:10:29.934534+00
c8b9194e-118c-4a0e-8074-767a404b4ddd	28c62465-f2c9-4653-adae-0918420f06a3	1c1df301-da2b-4ed7-aa41-bf216a66d009	2026-01-20 06:15:58.639567+00
58cbc424-4252-4a6d-9e1c-245820739242	28c62465-f2c9-4653-adae-0918420f06a3	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-21 06:44:12.519123+00
4adecd20-cc4d-42a8-af5a-ba64c7ae9886	d41a6dbf-b002-4b46-ac48-f35492f3814d	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-21 06:45:28.455407+00
f815f130-db1e-4e76-8646-268ae6618ecc	28c62465-f2c9-4653-adae-0918420f06a3	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-21 06:54:52.972295+00
9a227e24-0021-4114-8219-6df78c33dc65	e6b29f58-e106-46c6-9eab-a1c2f119493b	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-21 07:13:38.37967+00
017934b5-544f-4580-92bb-06f8b70266cd	28c62465-f2c9-4653-adae-0918420f06a3	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:16:58.440054+00
5a4c04b8-ca1b-4090-a92e-258c3ec34f6a	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:27:43.615039+00
d5399941-4b74-498b-ac9f-7f738bc02eeb	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:53:44.150893+00
f04adb31-f246-496e-9e63-f7d9c5ab180a	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:53:46.279376+00
0680c49f-cb22-47e4-a92c-8db7f91c3eeb	e6b29f58-e106-46c6-9eab-a1c2f119493b	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:53:48.55107+00
2316a579-427c-4be4-a860-8534e07264d7	28c62465-f2c9-4653-adae-0918420f06a3	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:53:53.236934+00
2e4e948c-15f3-4e1e-bce1-63f7a3d82326	d41a6dbf-b002-4b46-ac48-f35492f3814d	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:54:26.53846+00
b2206b11-a096-46f7-949b-86be5043ef14	d41a6dbf-b002-4b46-ac48-f35492f3814d	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:03:24.785344+00
e2337792-bf50-4a7e-9d3f-f0d68d267c2d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:03:37.371081+00
96a1b3a5-8012-41cb-9297-a1ba88673ea2	28c62465-f2c9-4653-adae-0918420f06a3	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:03:43.169465+00
63b2d9e5-e1a4-4009-8f9a-5c68320a22fb	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:35.134682+00
dcd89286-88bc-459e-bca1-b3a1a407beb1	e6b29f58-e106-46c6-9eab-a1c2f119493b	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:46.387955+00
d7a4d80a-2d5f-4fd4-ad16-7a6b097b0fc5	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:49.01831+00
ff2e6a7b-ffad-49fd-a76f-faaaf81a1bb2	28c62465-f2c9-4653-adae-0918420f06a3	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:54.070336+00
e5e31184-c705-4794-8b24-27f303e6a493	d41a6dbf-b002-4b46-ac48-f35492f3814d	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:59.332679+00
ef1c59ab-a64e-4699-a2e6-2027db2da554	28c62465-f2c9-4653-adae-0918420f06a3	36597eb2-1818-4c3f-b98e-6ba968c77dc4	2026-01-21 09:06:52.612237+00
b649f44c-8e2c-42a4-bf73-b074753d7d7e	d41a6dbf-b002-4b46-ac48-f35492f3814d	36597eb2-1818-4c3f-b98e-6ba968c77dc4	2026-01-21 09:06:57.926358+00
b7a2f7d6-a261-4a82-b848-31e454e971f9	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:12:08.190398+00
715c23b0-148a-48a9-98b7-8de0f2b5e43d	e6b29f58-e106-46c6-9eab-a1c2f119493b	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:12:11.181861+00
319e0a50-0749-43df-acfd-e5e210197094	28c62465-f2c9-4653-adae-0918420f06a3	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:12:15.588664+00
b68a7982-f251-4e2b-a71a-415d37704dd5	d41a6dbf-b002-4b46-ac48-f35492f3814d	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:12:23.265816+00
b3bae094-07af-4d9c-aac1-4ea0892be5d0	28c62465-f2c9-4653-adae-0918420f06a3	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:16.681702+00
9eb0a015-c58d-42ce-885b-40334962389c	d41a6dbf-b002-4b46-ac48-f35492f3814d	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:23.143707+00
543659a5-c80b-4b8f-a172-4c42fcad2f36	e6b29f58-e106-46c6-9eab-a1c2f119493b	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:35.036105+00
68731d6f-46a5-458a-87cd-6f9daecc8cc9	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:37.243164+00
ff16367d-97e3-4fe7-a7b0-040e36f70afa	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:41.733951+00
e8a82636-7280-458b-b85b-4605681cfe96	d41a6dbf-b002-4b46-ac48-f35492f3814d	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:15:53.075766+00
f7494a0d-4461-486c-b7f1-9f2a4778c648	28c62465-f2c9-4653-adae-0918420f06a3	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:15:57.877104+00
90341ee4-75e5-490e-97eb-59e78fdab861	e6b29f58-e106-46c6-9eab-a1c2f119493b	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:16:18.349733+00
33bc9ece-3d85-4136-97d0-eeae5a153f6a	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:16:20.507905+00
a915a97b-7c26-410f-9270-df4955dbcda7	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:16:22.978646+00
95b343c7-4f72-4c8a-a3d3-eedf19ed3793	28c62465-f2c9-4653-adae-0918420f06a3	a49342a7-3158-433b-a256-172b68d1de57	2026-01-21 09:21:50.443093+00
c56e6d57-af2c-40c4-97db-3ea9d6b74c97	d41a6dbf-b002-4b46-ac48-f35492f3814d	a49342a7-3158-433b-a256-172b68d1de57	2026-01-21 09:24:19.499771+00
315783f6-4cd1-4303-9a35-612018bd4b50	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:06.492196+00
57e95a2b-ac30-4f5a-9fd5-22d13099ea5f	e6b29f58-e106-46c6-9eab-a1c2f119493b	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:09.080549+00
c571f3b1-6a20-4c3d-a3bd-f8df3fef541d	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:10.83216+00
57ce5b3d-fbca-4ed4-89d8-e110cccef027	28c62465-f2c9-4653-adae-0918420f06a3	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:14.613112+00
c5b56e4c-4155-429d-af44-7fbfc1dbcf57	d41a6dbf-b002-4b46-ac48-f35492f3814d	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:24.835219+00
28d57f5b-fadd-497a-8f0c-0d3853d017d9	28c62465-f2c9-4653-adae-0918420f06a3	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:30:58.650847+00
019e973d-9240-4205-9e13-83a57db1724c	d41a6dbf-b002-4b46-ac48-f35492f3814d	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:31:05.723636+00
96b039f1-0679-4910-ad9d-2589a49f91a8	e6b29f58-e106-46c6-9eab-a1c2f119493b	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:31:42.75173+00
327ce995-189c-4b4a-addb-4db240fbd5dd	e6b29f58-e106-46c6-9eab-a1c2f119493b	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:16.653901+00
3d5c1a50-6f7e-401e-a176-c8e82e240af9	28c62465-f2c9-4653-adae-0918420f06a3	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:20.866781+00
a9667431-6668-4c41-90b5-b672042a745a	d41a6dbf-b002-4b46-ac48-f35492f3814d	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:34:06.932379+00
d9316c07-e2c6-47e4-a892-3e31d1156443	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:26.72772+00
dbaa2242-b250-4056-8f9a-a3c0af0c76a7	e6b29f58-e106-46c6-9eab-a1c2f119493b	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:28.160843+00
e14bb6f0-e169-4c3e-8dbf-7e6e8132e44a	28c62465-f2c9-4653-adae-0918420f06a3	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:32.566685+00
ee83c6b1-2ab3-4ade-8dee-51f39b1e8293	d41a6dbf-b002-4b46-ac48-f35492f3814d	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:37.657526+00
5f592686-3799-4019-a377-fe429d6fedfb	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:51.354731+00
698f7ce9-78ed-4cb0-8be0-4e593e3beb02	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:48.30331+00
25bc400a-53e7-4f8b-91aa-7f76cb285a43	e6b29f58-e106-46c6-9eab-a1c2f119493b	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:50.430716+00
a9275737-e2b6-4f51-9563-ea7bf67dea4f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:09:16.549824+00
17936c43-d130-4da1-b825-6f6231564262	28c62465-f2c9-4653-adae-0918420f06a3	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:54.496603+00
3eef28e5-8181-4556-ba0d-3c836a5ea064	d41a6dbf-b002-4b46-ac48-f35492f3814d	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:37:56.01834+00
35024887-e3b2-4b4e-ba3e-51caf7192349	28c62465-f2c9-4653-adae-0918420f06a3	535c19e9-df3b-46c1-95dc-f93cb3f22afe	2026-01-21 09:41:00.281519+00
c7735913-a96b-4a86-9dfb-b89a4eaada9e	28c62465-f2c9-4653-adae-0918420f06a3	b7215524-a4d6-4661-a7c3-83643d53bc8d	2026-01-21 09:44:55.417677+00
53966cb0-e30f-4511-9736-6388fa98c8d5	28c62465-f2c9-4653-adae-0918420f06a3	8c016324-b2b4-42b8-a89f-a46687f7e589	2026-01-21 09:53:07.2456+00
5c000a9b-ba61-40d7-affd-ce1f5d6f6acd	d41a6dbf-b002-4b46-ac48-f35492f3814d	8c016324-b2b4-42b8-a89f-a46687f7e589	2026-01-21 09:53:15.089886+00
1f1b2306-faae-4638-b8d6-f0464def9556	e6b29f58-e106-46c6-9eab-a1c2f119493b	2ce59d73-d507-4df2-8254-b780773e6465	2026-06-07 15:44:32.613069+00
dbdb5c5b-eefb-4941-9645-cb1a93b2aae3	28c62465-f2c9-4653-adae-0918420f06a3	02d46548-0441-412d-b12b-f0830a264840	2026-01-21 09:54:28.144288+00
9b81ba0e-4c7b-46c0-8795-6f79f404a274	d41a6dbf-b002-4b46-ac48-f35492f3814d	02d46548-0441-412d-b12b-f0830a264840	2026-01-21 09:54:41.876977+00
e887a2f3-6ea9-458e-a8bc-f807acae0ddf	28c62465-f2c9-4653-adae-0918420f06a3	bf7fddef-097c-4ab3-902c-1518c74a15cf	2026-01-21 09:55:57.211733+00
0f36be00-02d9-48b5-a1d7-6ab60dd0f7f6	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:38.44897+00
ebdb4f85-a420-4a4b-92fa-61c43ce0bc58	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:41.651398+00
048fcfa1-142a-4203-a1b5-73c298ed3407	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:44.744479+00
2351ca0b-21ef-4bc9-9cb8-bc983f5162b1	28c62465-f2c9-4653-adae-0918420f06a3	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:59.603607+00
639f1339-1b30-4d07-a1e3-93e159f0272c	28c62465-f2c9-4653-adae-0918420f06a3	8c6c740c-b564-48ae-9b85-a164e99155fd	2026-01-21 10:22:43.321104+00
1b9acb74-bdbd-4947-8126-5ae8bff57152	d41a6dbf-b002-4b46-ac48-f35492f3814d	8c6c740c-b564-48ae-9b85-a164e99155fd	2026-01-21 10:22:56.301491+00
8e709618-2566-4244-afff-261d84d0829a	28c62465-f2c9-4653-adae-0918420f06a3	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:27.931192+00
0030c766-8c64-4f58-912f-7789d9b5cd6f	d41a6dbf-b002-4b46-ac48-f35492f3814d	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:35.357362+00
1f8afd1e-2027-4a5e-89cc-ec7e53338c22	28c62465-f2c9-4653-adae-0918420f06a3	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	2026-01-21 10:26:20.932242+00
78a717cf-3483-48f8-8220-e9fae0a71471	d41a6dbf-b002-4b46-ac48-f35492f3814d	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	2026-01-21 10:26:28.659253+00
18a6c46b-06aa-447f-bfc9-c0578800df23	28c62465-f2c9-4653-adae-0918420f06a3	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	2026-01-21 10:27:21.071816+00
58b114fb-f818-46f6-b3c4-c3a8a142ca57	28c62465-f2c9-4653-adae-0918420f06a3	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:11.984227+00
4e1fc950-4b5d-481f-ac1d-73257bab6950	d41a6dbf-b002-4b46-ac48-f35492f3814d	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:16.726477+00
bf871bda-c0a5-4a4f-9d5c-c90da7982919	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:23.548365+00
e13970d5-eec0-45be-8bbf-590955ee50fd	28c62465-f2c9-4653-adae-0918420f06a3	8bc0ba75-9312-45a3-9848-b6d2ff53501c	2026-01-21 10:29:04.071807+00
b033e1af-07ed-446e-82dd-bec462fade88	28c62465-f2c9-4653-adae-0918420f06a3	ab956951-8ac0-4c28-9c8c-0a76af78c939	2026-01-21 10:30:10.790326+00
4a9a464a-ccf0-4c5c-b4f3-af4fe7c12016	d41a6dbf-b002-4b46-ac48-f35492f3814d	ab956951-8ac0-4c28-9c8c-0a76af78c939	2026-01-21 10:30:23.885947+00
623e76ca-5793-4de6-8ee2-9a9ac29bebf6	28c62465-f2c9-4653-adae-0918420f06a3	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	2026-01-21 10:31:46.766811+00
aebc8ce3-ee8c-485a-b0cd-574f5401c6e0	d41a6dbf-b002-4b46-ac48-f35492f3814d	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:46.415461+00
82cec83c-906b-4118-9e28-81d390e71c91	28c62465-f2c9-4653-adae-0918420f06a3	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:51.353027+00
99e6a058-d0a4-4628-a554-c7f221bbe4d1	e6b29f58-e106-46c6-9eab-a1c2f119493b	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:56.256464+00
08efde7b-d842-43f2-afa5-098ec0428485	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:58.508163+00
88efa98d-7fa5-44bb-bb38-56750e8ce016	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:33:00.135615+00
8b278419-b7f0-48fa-b586-a2bfc8ed7023	28c62465-f2c9-4653-adae-0918420f06a3	4c9b06d2-6e48-490f-9aca-827a7b94d76b	2026-01-21 10:33:48.137941+00
c83b14fa-cdf7-4595-aa8e-74f972960c2b	28c62465-f2c9-4653-adae-0918420f06a3	766613de-ab18-45a2-9c57-ab6e838c91aa	2026-01-21 10:34:50.841789+00
5b769a8d-1e90-4e9d-9a60-c8bb037bb7b5	28c62465-f2c9-4653-adae-0918420f06a3	a180426f-c6d9-4ed7-b56b-c299364d2c4f	2026-01-21 10:46:53.183684+00
58531c66-39fc-4298-805b-fb343bffa308	d41a6dbf-b002-4b46-ac48-f35492f3814d	a180426f-c6d9-4ed7-b56b-c299364d2c4f	2026-01-21 10:52:06.138171+00
bd08077b-589e-40bb-bf28-daa929edbb15	28c62465-f2c9-4653-adae-0918420f06a3	9b348117-d9c8-44b7-b321-4c8a3ce50818	2026-01-22 00:34:18.285868+00
53d482e5-0d00-4c5a-b88f-e238d6624215	d41a6dbf-b002-4b46-ac48-f35492f3814d	9b348117-d9c8-44b7-b321-4c8a3ce50818	2026-01-22 00:34:22.353161+00
b5ed3926-53ca-40d0-ae14-62ff62d64cc5	28c62465-f2c9-4653-adae-0918420f06a3	511c3f9d-9125-4586-b351-45348ad11743	2026-01-22 00:35:17.263056+00
6e3d536f-c1c4-4753-8b90-e71df4e85961	d41a6dbf-b002-4b46-ac48-f35492f3814d	511c3f9d-9125-4586-b351-45348ad11743	2026-01-22 00:35:23.957882+00
c679e00a-81e1-4a89-a173-623bc018e7a0	e6b29f58-e106-46c6-9eab-a1c2f119493b	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:46.022356+00
1f6e5444-704d-459f-9bb2-c5e7dcff5d62	28c62465-f2c9-4653-adae-0918420f06a3	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:49.317317+00
8afa2e29-8623-4c96-a0bd-5b00f50ca9f5	d41a6dbf-b002-4b46-ac48-f35492f3814d	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:58.237806+00
e0dfef9a-f74a-4746-9166-c903dfdb3401	28c62465-f2c9-4653-adae-0918420f06a3	e391e0c4-a811-4ac0-9989-b426e101833d	2026-01-22 00:39:58.405688+00
cc5a3de0-0f42-40bb-84b6-12bee54fc882	d41a6dbf-b002-4b46-ac48-f35492f3814d	e391e0c4-a811-4ac0-9989-b426e101833d	2026-01-22 00:40:04.354528+00
f2b199c1-1699-4cbd-9a23-ddcb3e4efb2a	28c62465-f2c9-4653-adae-0918420f06a3	50644fc3-8363-44f2-836e-61b3a252478d	2026-01-22 00:41:51.374866+00
831bc449-fe00-4354-bc42-13df5eb3127d	d41a6dbf-b002-4b46-ac48-f35492f3814d	50644fc3-8363-44f2-836e-61b3a252478d	2026-01-22 00:41:57.824085+00
17c7feea-2664-4443-beaa-a5fb1999f714	28c62465-f2c9-4653-adae-0918420f06a3	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:43:01.747951+00
7927b7a0-156c-4a69-bedd-31a7fb9bc238	d41a6dbf-b002-4b46-ac48-f35492f3814d	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:43:06.814231+00
d9cba2e5-f8b6-450a-a35a-ec37c8e1d0a4	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:43:21.481589+00
4628bf46-604d-427a-a28e-b4007893faab	28c62465-f2c9-4653-adae-0918420f06a3	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	2026-01-22 00:44:11.053423+00
68d19045-d07b-4732-af98-a77eb1435ed4	28c62465-f2c9-4653-adae-0918420f06a3	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:46:01.392205+00
53e53d57-8122-4ade-adb6-6da010b43447	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:46:09.29072+00
9e8608d6-9ac8-4c81-bd02-a665de006042	e6b29f58-e106-46c6-9eab-a1c2f119493b	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:46:12.603901+00
18391470-bdc0-4c08-97ba-7fc947cd6e13	d41a6dbf-b002-4b46-ac48-f35492f3814d	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:46:23.35584+00
5ac92f2a-b89f-41e7-b19c-4d1e425f573e	e6b29f58-e106-46c6-9eab-a1c2f119493b	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:34.577383+00
a73a65ac-0d64-40bb-88dd-aac2a8d8bf4f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:37.642957+00
ead1d042-0131-4b09-9a8b-8ca4e7b6d387	28c62465-f2c9-4653-adae-0918420f06a3	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:43.036031+00
72f8ab00-66f1-46a4-96e8-7572383c308a	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:48:45.991181+00
c881d687-d061-41dd-bd33-b625d95fd631	28c62465-f2c9-4653-adae-0918420f06a3	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:49:22.772308+00
ecb06180-e2ff-4a6d-8850-fdd9b61b7ed6	d41a6dbf-b002-4b46-ac48-f35492f3814d	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:49:39.856333+00
37601ffa-0376-47a0-825b-af6eae393b09	28c62465-f2c9-4653-adae-0918420f06a3	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	2026-01-22 00:50:56.971664+00
02dad1ca-04f6-46e6-a907-dcc84f630482	d41a6dbf-b002-4b46-ac48-f35492f3814d	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	2026-01-22 00:51:04.690814+00
32effa3d-6c0d-41de-bb62-6e1048e37f93	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-03-25 19:02:00.015348+00
e8ee9b51-ad19-4008-a648-2125e7db0e24	28c62465-f2c9-4653-adae-0918420f06a3	fc6c6611-60cb-44d8-8de7-613f7d7869b5	2026-01-22 00:52:13.597656+00
0b31f996-bb3e-402c-b710-8e26774a993d	28c62465-f2c9-4653-adae-0918420f06a3	8d390cb3-59e1-45c3-93a0-1459b74498a4	2026-01-22 00:53:19.172193+00
ebb81015-209f-4991-b4aa-58ece08c7acb	e6b29f58-e106-46c6-9eab-a1c2f119493b	8d390cb3-59e1-45c3-93a0-1459b74498a4	2026-01-22 00:53:29.138471+00
de8ff68e-196e-4bb5-975c-6c7540d8fc42	e6b29f58-e106-46c6-9eab-a1c2f119493b	5d100834-5494-4217-ac7c-e02053c4f016	2026-06-14 07:22:42.50549+00
2b633976-c695-4b6c-adbd-9f4e758e59d8	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c801a58c-8dde-4ff0-9193-cd33de0e1e03	2026-01-22 01:01:03.895117+00
0c986763-038b-4c21-b8ef-3dcdbf1cb133	28c62465-f2c9-4653-adae-0918420f06a3	c801a58c-8dde-4ff0-9193-cd33de0e1e03	2026-01-22 01:01:09.018594+00
7ff2da80-cae4-4735-bd45-885f154292a9	d41a6dbf-b002-4b46-ac48-f35492f3814d	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	2026-01-22 01:05:42.91113+00
eec91d42-13eb-4dce-bf0a-2474962bedcd	28c62465-f2c9-4653-adae-0918420f06a3	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	2026-01-22 01:08:14.870349+00
90a0ff5a-39b1-4cb9-9a8f-2f64227342f1	d41a6dbf-b002-4b46-ac48-f35492f3814d	71415285-c1cb-4855-82ee-37585c51eef9	2026-01-22 01:09:21.744118+00
10f2394b-c8b9-46a6-8327-6c3d1bba1152	28c62465-f2c9-4653-adae-0918420f06a3	71415285-c1cb-4855-82ee-37585c51eef9	2026-01-22 01:09:32.880584+00
fc1babc0-d964-4245-9a2c-3b2644b37dbf	28c62465-f2c9-4653-adae-0918420f06a3	d40eddeb-94f1-4a8e-b05e-f8a02843b691	2026-01-22 01:12:27.855263+00
211faff7-21b4-4a82-a9fe-d0f041a40cd6	d41a6dbf-b002-4b46-ac48-f35492f3814d	d40eddeb-94f1-4a8e-b05e-f8a02843b691	2026-01-22 01:12:43.83223+00
9379e31f-9274-4930-b423-42b58a97bf72	28c62465-f2c9-4653-adae-0918420f06a3	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	2026-01-22 01:15:18.852274+00
fcb8c825-3efb-4b9a-9361-dd0b0e2e51e3	d41a6dbf-b002-4b46-ac48-f35492f3814d	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	2026-01-22 01:15:22.887588+00
c40e3065-e8ab-4966-b62d-2d66d7e3b8d1	28c62465-f2c9-4653-adae-0918420f06a3	1919a069-3c62-4408-9f6b-aba65bbdcce7	2026-01-22 01:16:47.994511+00
a2c0680f-c88b-462d-8ae0-4c4dec0238b1	d41a6dbf-b002-4b46-ac48-f35492f3814d	1919a069-3c62-4408-9f6b-aba65bbdcce7	2026-01-22 01:17:04.37031+00
c16c8790-a8c0-4f0f-b591-505eeecf17f1	d41a6dbf-b002-4b46-ac48-f35492f3814d	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:18:47.859209+00
c49f6718-da99-4ff5-ac43-c6b5584be6d6	28c62465-f2c9-4653-adae-0918420f06a3	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:18:52.668292+00
92f52fc0-9b44-406d-8792-95e34f537ee4	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:19:08.891648+00
e90c4b45-c512-4057-8a06-7ab755b8c6f4	28c62465-f2c9-4653-adae-0918420f06a3	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	2026-01-22 01:19:59.594939+00
1e8d763f-8b22-4277-bcfc-eab12355df17	d41a6dbf-b002-4b46-ac48-f35492f3814d	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	2026-01-22 01:20:05.858868+00
81cee77e-4655-40a9-bcb9-1b8db628c614	d41a6dbf-b002-4b46-ac48-f35492f3814d	761258bd-d832-4b3e-8f14-bb8e3f934d26	2026-01-22 01:21:20.952055+00
57cbca24-14c6-4fa0-a095-cd420239e7b3	28c62465-f2c9-4653-adae-0918420f06a3	761258bd-d832-4b3e-8f14-bb8e3f934d26	2026-01-22 01:21:32.222461+00
5eb75c74-f0fd-45d7-9975-5a77101e2c5d	28c62465-f2c9-4653-adae-0918420f06a3	f8e9a265-897e-43b8-adee-a431e9c3bee9	2026-01-22 01:23:14.01619+00
965d02ba-4cc0-4dc7-9a42-45d5fa16f35e	28c62465-f2c9-4653-adae-0918420f06a3	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	2026-01-22 01:24:38.921686+00
9fafdb02-f879-453b-a397-d14b430e5f05	d41a6dbf-b002-4b46-ac48-f35492f3814d	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	2026-01-22 01:24:56.841049+00
5a8d5998-4b65-4a21-8bb3-60897174fb5a	e6b29f58-e106-46c6-9eab-a1c2f119493b	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	2026-01-22 01:26:11.418709+00
aae201e7-8d5d-4edd-a126-4ea2743dc561	28c62465-f2c9-4653-adae-0918420f06a3	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	2026-01-22 01:26:15.813403+00
03f6285e-d99e-4ffa-bab0-4b0ccab1593d	28c62465-f2c9-4653-adae-0918420f06a3	cfd6e3a8-82ce-4a45-b613-0e78fa463439	2026-01-22 01:30:31.258215+00
5af56908-43ba-41bd-aa39-0fb76faca060	d41a6dbf-b002-4b46-ac48-f35492f3814d	cfd6e3a8-82ce-4a45-b613-0e78fa463439	2026-01-22 01:30:45.456438+00
6eb174c7-c567-4b6b-a3d3-e13309b516db	e6b29f58-e106-46c6-9eab-a1c2f119493b	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:20.467219+00
fc0bf2b4-23a8-436e-9049-7b189d2320cf	28c62465-f2c9-4653-adae-0918420f06a3	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:32.913986+00
d4d6bd0f-d865-4f3b-a98a-b2c76310319d	d41a6dbf-b002-4b46-ac48-f35492f3814d	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:39.664757+00
95240457-61b4-44b7-8852-4d481ae39970	28c62465-f2c9-4653-adae-0918420f06a3	5981f73f-c8eb-46ca-97cf-61bb2373bc52	2026-01-22 01:38:56.334583+00
8da4eff9-fcec-45cc-99e6-7675e636c030	d41a6dbf-b002-4b46-ac48-f35492f3814d	5981f73f-c8eb-46ca-97cf-61bb2373bc52	2026-01-22 01:38:58.266238+00
7a6cf8f7-4e0b-43c5-b3d9-544938bd4644	28c62465-f2c9-4653-adae-0918420f06a3	4733c4f2-b333-4f33-8526-490f50a57499	2026-01-22 01:39:50.186563+00
f2364b9e-5a04-45af-b62b-3327fbe96af8	e6b29f58-e106-46c6-9eab-a1c2f119493b	4733c4f2-b333-4f33-8526-490f50a57499	2026-01-22 01:40:32.143343+00
1ed7a8aa-c3ab-44c1-9e1f-d10d4c78abeb	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	2026-01-22 01:41:38.106574+00
3c125e49-8968-4e94-9998-04424f060019	28c62465-f2c9-4653-adae-0918420f06a3	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	2026-01-22 01:41:45.162423+00
ab987dad-8e24-4df8-bbd8-6806daeb8a51	d41a6dbf-b002-4b46-ac48-f35492f3814d	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	2026-01-22 01:43:25.619002+00
3348a97d-1832-48a0-8d92-5e62b88bda55	28c62465-f2c9-4653-adae-0918420f06a3	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	2026-01-22 01:43:37.600914+00
f5c327b5-0ee0-44a3-9d9c-ebde795a0cd5	28c62465-f2c9-4653-adae-0918420f06a3	d28140c0-4739-4adb-b40c-dad97b2551bd	2026-01-22 01:44:55.342667+00
0852783d-8492-47ee-bf37-b4686feca857	28c62465-f2c9-4653-adae-0918420f06a3	29573c2b-fdf5-4831-974c-9851cb4d9fc3	2026-01-22 01:47:04.301797+00
c43603c7-4ab7-4356-ac41-0c921e9c7bb8	28c62465-f2c9-4653-adae-0918420f06a3	1e2967ab-e057-4927-8fe4-b2f769a5a6df	2026-01-22 01:48:52.698761+00
0c6bfa40-10f3-47c1-b2f8-f6f11fbd9fc0	28c62465-f2c9-4653-adae-0918420f06a3	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	2026-01-22 01:50:17.095299+00
ac80c040-21fe-4d11-951f-179bc5646677	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	2026-01-22 01:51:22.147508+00
5e85c89e-6ad7-4d59-9a6c-0f46039273fd	28c62465-f2c9-4653-adae-0918420f06a3	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	2026-01-22 01:52:38.106325+00
ba3f2eae-f280-4d47-b8c6-e6166204b7cc	28c62465-f2c9-4653-adae-0918420f06a3	b9163fcb-75ec-4a35-8d45-1547315401ac	2026-01-22 01:53:33.177458+00
f82dbb7e-349f-4947-95e8-7c94e2ea0649	d41a6dbf-b002-4b46-ac48-f35492f3814d	b9163fcb-75ec-4a35-8d45-1547315401ac	2026-01-22 01:53:39.060928+00
d79e9d12-ffec-46bb-9aec-41f968e3e12a	28c62465-f2c9-4653-adae-0918420f06a3	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-22 01:54:52.297804+00
1dc084e0-6b23-4c94-ae23-406f103e5119	28c62465-f2c9-4653-adae-0918420f06a3	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	2026-01-22 01:55:56.423834+00
46c2fb38-068c-46b7-880a-976834458866	d41a6dbf-b002-4b46-ac48-f35492f3814d	ae856958-69bf-432e-bab2-262340b92e0d	2026-01-22 01:58:41.764757+00
fac73ae1-a1d5-43b1-80a5-ee8d39219610	28c62465-f2c9-4653-adae-0918420f06a3	ae856958-69bf-432e-bab2-262340b92e0d	2026-01-22 01:58:52.550501+00
15b81fc7-fc99-4519-89c7-2fbba92130b9	e6b29f58-e106-46c6-9eab-a1c2f119493b	2f835397-40fb-430f-96bb-3b23e988950e	2026-01-22 02:01:36.118683+00
940ef6e2-a528-4c10-bb6a-95c040a88ed0	28c62465-f2c9-4653-adae-0918420f06a3	2f835397-40fb-430f-96bb-3b23e988950e	2026-01-22 02:01:38.663917+00
9e19c9f1-aefe-4f60-86ae-e43edfff3dc8	28c62465-f2c9-4653-adae-0918420f06a3	5c53db2c-057e-4bf6-9782-31a25c74e269	2026-01-22 02:03:03.324117+00
fb0934a8-7f42-4bc7-9dc4-9096aab8f54f	e6b29f58-e106-46c6-9eab-a1c2f119493b	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:06:30.793709+00
871375f7-2049-4805-a825-db2578558f8e	28c62465-f2c9-4653-adae-0918420f06a3	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:06:36.65109+00
d9cfcf5c-6107-44c3-96f8-a7d3db08a515	d41a6dbf-b002-4b46-ac48-f35492f3814d	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:07:04.318028+00
278676bf-1c0f-417d-892e-de1d52b4b0b7	d41a6dbf-b002-4b46-ac48-f35492f3814d	b6d92a45-c510-4686-9f25-824bc32e96cb	2026-01-22 02:08:09.140362+00
2782db5d-7687-44da-b1fc-2ec96cb44064	28c62465-f2c9-4653-adae-0918420f06a3	b6d92a45-c510-4686-9f25-824bc32e96cb	2026-01-22 02:08:17.097167+00
af8d0f38-e594-4a24-91b8-a07c648bdd83	28c62465-f2c9-4653-adae-0918420f06a3	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	2026-01-22 02:09:43.54153+00
706d65fb-517f-4913-868b-e8747d969009	28c62465-f2c9-4653-adae-0918420f06a3	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	2026-01-22 02:11:26.244155+00
49d15bd2-08d1-4df9-966b-2ad4b63b0e56	28c62465-f2c9-4653-adae-0918420f06a3	143a5beb-1342-40f7-b9ef-3431b4c44da4	2026-01-22 02:13:12.00951+00
82af9b35-48ab-4d19-8cdc-9813b3207d8e	e6b29f58-e106-46c6-9eab-a1c2f119493b	3f43944a-64de-489a-aac4-7564b6367304	2026-01-22 02:14:14.169772+00
d176e693-51cb-4b57-a9e2-c457ad02851a	28c62465-f2c9-4653-adae-0918420f06a3	3f43944a-64de-489a-aac4-7564b6367304	2026-01-22 02:14:20.079912+00
6a322b6f-0873-496a-9925-9a7f5da37645	e6b29f58-e106-46c6-9eab-a1c2f119493b	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-03-25 19:02:02.980193+00
6d7ec9d5-8d62-4de7-9de6-f0359e8c6232	28c62465-f2c9-4653-adae-0918420f06a3	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	2026-01-22 02:15:22.818128+00
af45505d-3351-4177-ae63-dc43fce6635d	d41a6dbf-b002-4b46-ac48-f35492f3814d	9a92b411-973c-485e-9572-541a3989be22	2026-01-22 02:16:27.261569+00
03758c26-b134-4dd7-9e25-5bc4e0ca39e0	28c62465-f2c9-4653-adae-0918420f06a3	9a92b411-973c-485e-9572-541a3989be22	2026-01-22 02:16:37.529225+00
acfbabb3-2363-4609-a5b9-5b0ebd90fec1	d41a6dbf-b002-4b46-ac48-f35492f3814d	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	2026-01-22 02:17:39.150035+00
0dad2a8e-5d06-4ee9-b972-01e736a4d468	28c62465-f2c9-4653-adae-0918420f06a3	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	2026-01-22 02:17:44.107621+00
9ed4d1b6-6db1-4ee1-a4b6-7b8412cce297	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	5d100834-5494-4217-ac7c-e02053c4f016	2026-06-14 07:22:43.81127+00
23c941e8-4b6e-4ce9-8b74-d27df8cc3338	d41a6dbf-b002-4b46-ac48-f35492f3814d	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	2026-01-22 02:18:56.737384+00
86aad144-9f39-4e5f-a1d6-56a5906e41b3	28c62465-f2c9-4653-adae-0918420f06a3	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	2026-01-22 02:19:02.060161+00
6f5640fa-badb-44c8-b254-803a4be3a2d5	28c62465-f2c9-4653-adae-0918420f06a3	a3f52365-5616-4ae8-8b9d-dfba52c94270	2026-01-22 02:20:14.536068+00
bb892021-5d32-483c-acdc-01a597f52be8	e6b29f58-e106-46c6-9eab-a1c2f119493b	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:21:48.388137+00
7c5837da-6a6f-4d9e-8693-8b8f71f27002	28c62465-f2c9-4653-adae-0918420f06a3	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:21:53.905226+00
59cdad5a-7a2a-4f75-a8cc-d45f4a9042a6	d41a6dbf-b002-4b46-ac48-f35492f3814d	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:22:02.385163+00
cace4978-7d13-4856-9101-5e3fb39e8857	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	2026-01-22 02:23:53.064448+00
c74e1c60-a114-4555-b2ed-7c2ee5398ffc	28c62465-f2c9-4653-adae-0918420f06a3	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	2026-01-22 02:23:55.332607+00
e850bf1a-b91a-4e3d-9656-161683631850	e6b29f58-e106-46c6-9eab-a1c2f119493b	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:17.421502+00
7a04d1e0-7e75-480a-a436-d60f289b85c5	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:19.830244+00
2cce9ba9-8284-469d-a5da-11e6c51d7524	28c62465-f2c9-4653-adae-0918420f06a3	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:28.049079+00
6b1e4a0a-0cdc-4911-ab06-59c0562745dd	28c62465-f2c9-4653-adae-0918420f06a3	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	2026-01-22 03:09:09.387403+00
c5c6d2ce-259d-4a2c-abe6-b7d5b0520ddd	28c62465-f2c9-4653-adae-0918420f06a3	44d5783f-4535-4541-bb10-efcf81eec4a3	2026-01-22 03:10:40.722488+00
da19275f-ed15-4bb6-92b5-88b60e944033	28c62465-f2c9-4653-adae-0918420f06a3	4104824d-4aaa-4ce4-b304-d1074d61fba6	2026-01-22 03:12:09.400093+00
d9029fe0-9561-4df0-8f19-fce51707453c	28c62465-f2c9-4653-adae-0918420f06a3	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	2026-01-22 03:13:44.251494+00
33e5e663-f8ca-41c5-9de5-9dfe8bd4127a	28c62465-f2c9-4653-adae-0918420f06a3	6fb4e6fd-e573-4551-8480-91aaa0d63b80	2026-01-22 03:14:49.976759+00
6372d221-7d96-4a0a-9593-f4b486ecf137	e6b29f58-e106-46c6-9eab-a1c2f119493b	6fb4e6fd-e573-4551-8480-91aaa0d63b80	2026-01-22 03:15:29.179181+00
11e81fff-5e88-4ab6-8029-b5c097c01c45	28c62465-f2c9-4653-adae-0918420f06a3	6d277ecb-1abf-4361-b0c3-0948f3b8d234	2026-01-22 03:17:01.145854+00
be707307-2f70-4a0f-85d5-56bdc71100f5	28c62465-f2c9-4653-adae-0918420f06a3	7646b385-d2e4-4b95-acc5-c816e3cd1412	2026-01-22 03:18:45.265921+00
db645e61-2e09-4dc2-b9e2-2508d38aee71	28c62465-f2c9-4653-adae-0918420f06a3	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	2026-01-22 03:19:59.408227+00
67c24a38-e59c-4ca7-8442-9d9395a753ac	28c62465-f2c9-4653-adae-0918420f06a3	35dca33b-9d87-448c-80f5-a93eb0940c7f	2026-01-22 03:22:56.076517+00
2ccfccca-f4a6-4664-812e-2108536a31fb	28c62465-f2c9-4653-adae-0918420f06a3	9ec8512b-24ba-4581-a362-6f7a3a6c0235	2026-01-22 03:24:12.511142+00
6002b960-7bf7-4cda-861d-ce95bef5615c	28c62465-f2c9-4653-adae-0918420f06a3	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	2026-01-22 03:27:27.298009+00
b00e15f6-a5d0-49ec-8876-9efb11b17ebb	28c62465-f2c9-4653-adae-0918420f06a3	e15551b8-af10-46c7-b62e-b6736ca520cb	2026-01-22 03:29:37.596456+00
a8e5cc22-6ab9-46b9-b9cf-c6baf9e2ca28	28c62465-f2c9-4653-adae-0918420f06a3	88818637-080c-4c99-ae7d-265f4f7ada85	2026-01-22 03:31:23.871125+00
ac9a6238-2adb-4094-818a-1044615d40c5	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-23 10:10:55.726955+00
21f1d4ff-e8ee-411a-a353-4638e3c7d29b	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-23 10:10:57.550948+00
650f4c8f-a32c-4861-8731-4406fb8833f1	e6b29f58-e106-46c6-9eab-a1c2f119493b	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-23 10:11:00.424515+00
ca153777-66cb-4ba4-83e4-8a4a46a0edec	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-23 10:11:02.213861+00
\.


--
-- Data for Name: post_shares; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_shares (id, post_id, user_id, original_user_id, created_at) FROM stdin;
1b724197-6faa-4510-b35b-58b16478e7c8	d41a6dbf-b002-4b46-ac48-f35492f3814d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-16 06:38:00.61222+00
67f7c30b-0cdc-4d76-90d7-40e2d11f70d8	d41a6dbf-b002-4b46-ac48-f35492f3814d	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-16 06:53:25.569124+00
d8913260-b486-40a7-bbd5-3534caa8a767	28c62465-f2c9-4653-adae-0918420f06a3	6c45203b-a5ff-4f1c-be40-6bce6188f757	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-16 06:59:06.722359+00
6bb055fb-78be-49fc-8ac9-6b16d0ffc856	28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-17 17:52:16.164515+00
b3647e2d-ccab-4bb6-91ac-1ef9c44d34a5	28c62465-f2c9-4653-adae-0918420f06a3	9251db17-0835-41c7-8469-28dee88096b1	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-18 11:51:01.849148+00
10dfea99-2ea1-4000-a669-3ad17ad39df3	28c62465-f2c9-4653-adae-0918420f06a3	1c1df301-da2b-4ed7-aa41-bf216a66d009	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-20 06:16:01.152234+00
1964b07d-eacd-45b9-8397-638085b4bb13	d41a6dbf-b002-4b46-ac48-f35492f3814d	17bdad1d-532c-4a07-9936-669d62c8ef04	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 06:45:36.33862+00
4a00b8ff-484b-455d-aa16-9caf30c94523	28c62465-f2c9-4653-adae-0918420f06a3	e977b62e-005f-4c17-9384-1f9a6283ca02	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 06:54:55.272258+00
793a8155-3dd0-4f2b-ac55-43ab6ad6fdb6	28c62465-f2c9-4653-adae-0918420f06a3	06558882-7a10-4b69-b8e0-4fef2684a434	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 07:17:00.392109+00
2ba345ae-9a16-4f63-bea0-009da077a58d	28c62465-f2c9-4653-adae-0918420f06a3	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 07:53:54.845386+00
3a4dc8c1-eff7-48b2-b08c-359fffdbf42b	28c62465-f2c9-4653-adae-0918420f06a3	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:03:45.241994+00
ef4fefc0-98e8-4f84-950a-e6464891f82c	28c62465-f2c9-4653-adae-0918420f06a3	36597eb2-1818-4c3f-b98e-6ba968c77dc4	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:06:54.105584+00
48e7dc5c-94e8-4c21-86e7-01bf1c049e8d	d41a6dbf-b002-4b46-ac48-f35492f3814d	36597eb2-1818-4c3f-b98e-6ba968c77dc4	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 09:06:59.585952+00
6a004d20-722f-4293-a8ea-d14b2755ad98	28c62465-f2c9-4653-adae-0918420f06a3	c43b8800-64e8-4207-a797-6e432afc37d2	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:12:17.485007+00
1c860e15-a924-44cd-bce9-369c990f6319	28c62465-f2c9-4653-adae-0918420f06a3	a359520f-7b6e-4aff-9265-bb33afa669f5	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:14:17.988496+00
6e83a1e7-2f2d-4bc8-a3eb-4967b17ddba3	d41a6dbf-b002-4b46-ac48-f35492f3814d	a359520f-7b6e-4aff-9265-bb33afa669f5	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 09:14:25.329632+00
05d34716-beba-48ae-a7a7-89d6553d1624	28c62465-f2c9-4653-adae-0918420f06a3	be1c325d-845a-4e30-bdc0-0a4b90419b71	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:15:59.863719+00
c1d56b6c-cccf-4b6c-b713-792a2ade6e1b	28c62465-f2c9-4653-adae-0918420f06a3	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:27:15.927982+00
bf0c106a-221d-4139-8af8-2b7eaa9d27c7	28c62465-f2c9-4653-adae-0918420f06a3	e66c8ff2-f269-4bf0-8d22-58731ba77517	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:31:10.042976+00
70d1c689-a5ef-40b1-92a8-eff3e79be69f	28c62465-f2c9-4653-adae-0918420f06a3	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:33:21.77334+00
ab2d1471-bf7c-441d-a49f-d2868eed2587	d41a6dbf-b002-4b46-ac48-f35492f3814d	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 09:34:08.063715+00
fd5b5b61-13df-42aa-9822-fdfc9832dfcf	28c62465-f2c9-4653-adae-0918420f06a3	de671e87-8ed3-480f-a6af-d7707a4b75c9	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:36:56.71964+00
e1b00d03-f462-4b4c-b35a-a094d6917016	d41a6dbf-b002-4b46-ac48-f35492f3814d	de671e87-8ed3-480f-a6af-d7707a4b75c9	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 09:37:57.608221+00
551732bb-eb7c-4cde-b98c-f76bcdfcda12	28c62465-f2c9-4653-adae-0918420f06a3	535c19e9-df3b-46c1-95dc-f93cb3f22afe	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:41:07.404558+00
93c92e87-5ed5-409f-9289-69a7d1e10ef8	28c62465-f2c9-4653-adae-0918420f06a3	b7215524-a4d6-4661-a7c3-83643d53bc8d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:44:56.857823+00
08d6d6d8-2939-4670-bb6e-64030fde67fd	28c62465-f2c9-4653-adae-0918420f06a3	8c016324-b2b4-42b8-a89f-a46687f7e589	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:53:08.809528+00
bafda873-ec15-454d-9d95-f18c1277db53	28c62465-f2c9-4653-adae-0918420f06a3	bf7fddef-097c-4ab3-902c-1518c74a15cf	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:55:59.411816+00
e6f40c7b-5dd7-43fa-a4fd-edb146dd78bb	28c62465-f2c9-4653-adae-0918420f06a3	df78758b-da56-491d-a5c4-0c57316a771b	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:21:01.928584+00
23afc9ed-1e94-4576-8c17-5663d60d91f4	28c62465-f2c9-4653-adae-0918420f06a3	8c6c740c-b564-48ae-9b85-a164e99155fd	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:22:52.113851+00
cd474768-7079-41ea-9ee6-2467c2882ad0	28c62465-f2c9-4653-adae-0918420f06a3	97d42fa7-76a1-41f1-bedc-90ee426c32bf	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:24:30.090666+00
adeeebac-6d14-445d-9f92-efe9fbc40c34	d41a6dbf-b002-4b46-ac48-f35492f3814d	97d42fa7-76a1-41f1-bedc-90ee426c32bf	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 10:24:37.974038+00
d01208f3-322e-4aa7-a143-853305aba37e	28c62465-f2c9-4653-adae-0918420f06a3	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:26:23.427872+00
404e0ed1-953e-4215-b396-ea5b9fced031	28c62465-f2c9-4653-adae-0918420f06a3	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:27:25.058698+00
eafbd95b-7888-4bb5-9522-2698a3f18f20	28c62465-f2c9-4653-adae-0918420f06a3	4975439b-f977-44a7-b6ac-cecd2732e105	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:28:13.672858+00
b680eaec-3708-4d8f-ae7a-9052452e6ac2	28c62465-f2c9-4653-adae-0918420f06a3	8bc0ba75-9312-45a3-9848-b6d2ff53501c	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:29:19.617564+00
7609548d-7f60-4e6b-a10b-71c8bb61d58c	28c62465-f2c9-4653-adae-0918420f06a3	ab956951-8ac0-4c28-9c8c-0a76af78c939	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:30:12.730175+00
bd5bd61f-39df-4498-b582-b52416e9cb9f	28c62465-f2c9-4653-adae-0918420f06a3	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:31:48.143799+00
cdd919da-d338-4734-b6b0-4fb30e894c1b	28c62465-f2c9-4653-adae-0918420f06a3	4c9b06d2-6e48-490f-9aca-827a7b94d76b	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:33:50.075352+00
c10ad9a0-d1d0-4a52-9a19-bc9ecc06abc4	28c62465-f2c9-4653-adae-0918420f06a3	766613de-ab18-45a2-9c57-ab6e838c91aa	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:34:52.612659+00
f0cb5fbb-b610-4f6f-a4f3-cc56d6a6c40c	28c62465-f2c9-4653-adae-0918420f06a3	9b348117-d9c8-44b7-b321-4c8a3ce50818	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:34:19.780355+00
c0c47555-0cf2-43d9-9c14-8e626582a52c	d41a6dbf-b002-4b46-ac48-f35492f3814d	9b348117-d9c8-44b7-b321-4c8a3ce50818	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 00:34:24.048419+00
8944abe4-06ff-425d-a8d0-ed10ef9a8ae8	28c62465-f2c9-4653-adae-0918420f06a3	511c3f9d-9125-4586-b351-45348ad11743	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:35:18.480796+00
eb4b9cb8-5081-4b1b-bfd6-0c8339bf56ef	28c62465-f2c9-4653-adae-0918420f06a3	c9af8e81-b717-4d88-9a7c-5f821c0a384e	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:38:50.608852+00
339d0e44-bf42-45ea-9ec1-b7e128b08984	28c62465-f2c9-4653-adae-0918420f06a3	e391e0c4-a811-4ac0-9989-b426e101833d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:39:59.603754+00
40d0722d-286c-4ea6-b44c-1dae8624a72b	28c62465-f2c9-4653-adae-0918420f06a3	50644fc3-8363-44f2-836e-61b3a252478d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:41:54.290622+00
26681f03-0b19-46ac-965a-6306e762bc12	28c62465-f2c9-4653-adae-0918420f06a3	529cb4b3-5936-4705-be79-f332013e0beb	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:43:12.115128+00
21733f02-28e3-4b1b-a778-bd5af18f6f4e	28c62465-f2c9-4653-adae-0918420f06a3	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:44:12.369563+00
186fbf8f-bb95-4c16-b88a-4d19cf20b09c	28c62465-f2c9-4653-adae-0918420f06a3	c35ce40a-b44f-49a7-aa8e-ed95060759b1	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:46:03.234902+00
a09b38ec-8d72-408d-83c8-8a230a70e145	28c62465-f2c9-4653-adae-0918420f06a3	791939bf-486b-4d03-98df-7eefd4aa15f2	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:49:23.83647+00
71e41638-5a6f-4964-a499-bfe1291da1b4	28c62465-f2c9-4653-adae-0918420f06a3	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:50:58.153313+00
24ed08b8-fa73-4443-9425-23fad5a82117	28c62465-f2c9-4653-adae-0918420f06a3	fc6c6611-60cb-44d8-8de7-613f7d7869b5	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:52:14.708563+00
2d2a47dd-ba4b-4a05-98ce-78ed62a0b541	28c62465-f2c9-4653-adae-0918420f06a3	8d390cb3-59e1-45c3-93a0-1459b74498a4	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:53:20.59506+00
210285ce-f938-4ae8-8e07-8020f5606833	e6b29f58-e106-46c6-9eab-a1c2f119493b	8d390cb3-59e1-45c3-93a0-1459b74498a4	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-22 00:53:30.777278+00
d0fd3b19-f097-459b-9e5c-cd8484868098	28c62465-f2c9-4653-adae-0918420f06a3	c801a58c-8dde-4ff0-9193-cd33de0e1e03	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:01:11.110705+00
7ec7eeb7-be35-4a67-be71-2d88dc26ec94	d41a6dbf-b002-4b46-ac48-f35492f3814d	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 01:05:45.929949+00
4ce6e929-a372-430a-a441-4d52ee71e5e2	d41a6dbf-b002-4b46-ac48-f35492f3814d	71415285-c1cb-4855-82ee-37585c51eef9	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 01:09:23.224442+00
8b88ffab-111a-4337-9913-eb8ce6b863ca	28c62465-f2c9-4653-adae-0918420f06a3	71415285-c1cb-4855-82ee-37585c51eef9	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:09:34.967132+00
27d4fc9e-12f9-408e-869b-0e15b2371867	28c62465-f2c9-4653-adae-0918420f06a3	d40eddeb-94f1-4a8e-b05e-f8a02843b691	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:12:29.379239+00
f979ee89-6cc2-4f66-a2d3-cb1c8232ce6b	28c62465-f2c9-4653-adae-0918420f06a3	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:15:19.626945+00
661d3cd4-8ed8-4cc7-b4a7-979c31f2d2d4	28c62465-f2c9-4653-adae-0918420f06a3	1919a069-3c62-4408-9f6b-aba65bbdcce7	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:16:50.102602+00
ad1ff16c-0ee3-47b2-8398-caa54f25c5cd	28c62465-f2c9-4653-adae-0918420f06a3	31b8206a-ea5d-41cf-968e-6f19b87aba62	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:18:54.45156+00
46879ecd-a65a-4937-814f-69dafcbfb037	28c62465-f2c9-4653-adae-0918420f06a3	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:20:01.496778+00
72a9f93d-3551-4a58-b1a1-7089efbebdcf	d41a6dbf-b002-4b46-ac48-f35492f3814d	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 01:20:07.132744+00
0e95a575-5ddf-49c7-a02e-2ce884c5038b	28c62465-f2c9-4653-adae-0918420f06a3	761258bd-d832-4b3e-8f14-bb8e3f934d26	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:21:33.439986+00
88194956-aae3-4cfa-9f63-2f0f3b7a2c77	28c62465-f2c9-4653-adae-0918420f06a3	f8e9a265-897e-43b8-adee-a431e9c3bee9	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:23:15.077855+00
87cb90eb-5692-49b9-8896-01b47e64eac3	28c62465-f2c9-4653-adae-0918420f06a3	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:24:40.307392+00
b07d84a4-4e2c-49b8-8556-2d4f50bf4f8d	28c62465-f2c9-4653-adae-0918420f06a3	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:26:17.866712+00
7bb98157-2c53-497b-b327-482064b636e0	28c62465-f2c9-4653-adae-0918420f06a3	cfd6e3a8-82ce-4a45-b613-0e78fa463439	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:30:32.430528+00
32586b4a-51c8-46e8-bca3-365debae404e	28c62465-f2c9-4653-adae-0918420f06a3	af98d38f-7f5e-42d6-8349-e30c5a006801	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:37:34.251626+00
dfa3ceee-4e72-4d26-a9ba-3c3d844b2028	28c62465-f2c9-4653-adae-0918420f06a3	5981f73f-c8eb-46ca-97cf-61bb2373bc52	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:38:48.022155+00
5550a5de-ea02-4a66-9e6a-14fc3d385fff	28c62465-f2c9-4653-adae-0918420f06a3	4733c4f2-b333-4f33-8526-490f50a57499	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:39:51.252618+00
a8149672-b72c-4c25-9150-1694d864d524	28c62465-f2c9-4653-adae-0918420f06a3	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:43:39.079918+00
88be4a5f-53c2-40af-80ce-6ad7fd99e4d6	28c62465-f2c9-4653-adae-0918420f06a3	d28140c0-4739-4adb-b40c-dad97b2551bd	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:44:56.412807+00
6be9fd66-57dc-46f4-88a2-2f73cae9295a	28c62465-f2c9-4653-adae-0918420f06a3	1e2967ab-e057-4927-8fe4-b2f769a5a6df	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:48:53.781426+00
3991f7bb-29a5-4310-afaf-d825da2d2c50	28c62465-f2c9-4653-adae-0918420f06a3	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:50:18.183054+00
1d6e655e-2e39-4cda-bfd8-3303aa344776	28c62465-f2c9-4653-adae-0918420f06a3	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:52:39.348982+00
7f2b9539-9134-465c-a28d-b3fc90cf9895	28c62465-f2c9-4653-adae-0918420f06a3	b9163fcb-75ec-4a35-8d45-1547315401ac	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:53:34.24912+00
f429d482-a796-4c09-b5a5-9d71de4a33dd	d41a6dbf-b002-4b46-ac48-f35492f3814d	b9163fcb-75ec-4a35-8d45-1547315401ac	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 01:53:40.42305+00
d3399926-1517-4be0-bf03-b988330ce320	28c62465-f2c9-4653-adae-0918420f06a3	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:55:57.754093+00
5986d231-8134-4c25-9553-8b282b796121	28c62465-f2c9-4653-adae-0918420f06a3	ae856958-69bf-432e-bab2-262340b92e0d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:58:46.155679+00
cc1d512c-f963-4137-afa9-bd73089dd866	28c62465-f2c9-4653-adae-0918420f06a3	2f835397-40fb-430f-96bb-3b23e988950e	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:01:39.93969+00
3e44d0c5-2ec5-4d1a-94a4-eeec8e6661f1	28c62465-f2c9-4653-adae-0918420f06a3	5c53db2c-057e-4bf6-9782-31a25c74e269	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:03:08.85257+00
7f9e415a-cfe5-479e-9e12-6315b0e16c1d	28c62465-f2c9-4653-adae-0918420f06a3	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:06:35.680716+00
8ae5234b-738e-4cba-a4af-b38577d8935d	d41a6dbf-b002-4b46-ac48-f35492f3814d	b6d92a45-c510-4686-9f25-824bc32e96cb	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 02:08:10.25753+00
6dbff50b-bbc7-4ee6-97c3-b3198252ca2e	28c62465-f2c9-4653-adae-0918420f06a3	b6d92a45-c510-4686-9f25-824bc32e96cb	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:08:15.380004+00
a9119cef-4022-4b0c-9fd1-88dea83883e5	28c62465-f2c9-4653-adae-0918420f06a3	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:09:40.038655+00
14595594-b20c-4c3e-8720-3f1843c459f6	28c62465-f2c9-4653-adae-0918420f06a3	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:11:25.064857+00
67aaa7a3-ff51-4179-a497-e57ea094d859	28c62465-f2c9-4653-adae-0918420f06a3	143a5beb-1342-40f7-b9ef-3431b4c44da4	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:13:13.312978+00
2876e62c-127a-42da-970a-4b82503c2dd6	e6b29f58-e106-46c6-9eab-a1c2f119493b	3f43944a-64de-489a-aac4-7564b6367304	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-22 02:14:15.983057+00
12076f49-1b6c-4a9c-a8e0-25ef20e3a3f6	28c62465-f2c9-4653-adae-0918420f06a3	3f43944a-64de-489a-aac4-7564b6367304	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:14:21.505168+00
33834335-db16-47c4-a0eb-60d0c9f48d95	28c62465-f2c9-4653-adae-0918420f06a3	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:15:24.131853+00
12b3d7b6-e70c-4e07-af79-d6d5f6ba576f	28c62465-f2c9-4653-adae-0918420f06a3	9a92b411-973c-485e-9572-541a3989be22	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:16:38.795073+00
26e4b77b-710c-4b20-b666-2d936f145f12	d41a6dbf-b002-4b46-ac48-f35492f3814d	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 02:17:40.199557+00
d6fdb5db-e0a9-47a3-b4f3-fb743597975a	28c62465-f2c9-4653-adae-0918420f06a3	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:17:45.213261+00
48cb63a9-92f9-4848-b895-bbcaf5c9e385	d41a6dbf-b002-4b46-ac48-f35492f3814d	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 02:18:57.844795+00
0bece1e0-a554-43ba-b994-eeae7b95805c	28c62465-f2c9-4653-adae-0918420f06a3	a3f52365-5616-4ae8-8b9d-dfba52c94270	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:20:16.27432+00
7c5f4a25-fdd3-464b-8b8f-3f39d3bf0c1c	28c62465-f2c9-4653-adae-0918420f06a3	37868e58-66d7-4803-a276-eb6da072b972	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:21:55.531055+00
9135a2f0-602f-492f-9481-ffc8cd0f1701	28c62465-f2c9-4653-adae-0918420f06a3	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:23:55.567902+00
ac3e1ee9-3b10-491c-8159-bc551a3787e7	28c62465-f2c9-4653-adae-0918420f06a3	f404aa02-8c39-4c40-850e-f7f13b9a2adb	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:25:26.41063+00
fed30099-b81c-4041-b655-e0fa93545c3a	28c62465-f2c9-4653-adae-0918420f06a3	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:09:13.25091+00
f555db43-6d6f-44b9-ac80-aa76f8ab30b1	28c62465-f2c9-4653-adae-0918420f06a3	44d5783f-4535-4541-bb10-efcf81eec4a3	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:10:43.103852+00
8a3041e9-5fbb-4aab-add1-9537e22017fe	28c62465-f2c9-4653-adae-0918420f06a3	4104824d-4aaa-4ce4-b304-d1074d61fba6	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:12:11.059414+00
e0f67ef3-5e5b-42ac-b158-362a037c5477	28c62465-f2c9-4653-adae-0918420f06a3	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:13:45.884441+00
e839d555-7a8e-4900-9703-fb2ab74db855	28c62465-f2c9-4653-adae-0918420f06a3	6fb4e6fd-e573-4551-8480-91aaa0d63b80	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:14:51.034929+00
913c67be-236b-4743-a1cc-98ca5f96067c	28c62465-f2c9-4653-adae-0918420f06a3	6d277ecb-1abf-4361-b0c3-0948f3b8d234	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:17:06.625403+00
1bc5fb04-61dc-48f5-ab94-32d3f3b67ade	28c62465-f2c9-4653-adae-0918420f06a3	7646b385-d2e4-4b95-acc5-c816e3cd1412	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:18:46.616545+00
6d3c9aa7-2000-4146-8915-dd86fa9753ae	28c62465-f2c9-4653-adae-0918420f06a3	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:20:00.676565+00
56199308-b161-4f42-b28c-b6a594750340	28c62465-f2c9-4653-adae-0918420f06a3	35dca33b-9d87-448c-80f5-a93eb0940c7f	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:22:57.547275+00
e02fe694-b09a-4be5-bcdb-4c4ed6697ef6	28c62465-f2c9-4653-adae-0918420f06a3	9ec8512b-24ba-4581-a362-6f7a3a6c0235	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:24:13.874559+00
8bd71aa9-34ef-4c17-8b63-44ab5c4f9dea	28c62465-f2c9-4653-adae-0918420f06a3	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:27:29.289188+00
07283a04-34e4-4f4f-b4db-259f74aaf706	28c62465-f2c9-4653-adae-0918420f06a3	e15551b8-af10-46c7-b62e-b6736ca520cb	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:29:40.048187+00
220092ec-d128-4970-b9ca-a02f97607e37	28c62465-f2c9-4653-adae-0918420f06a3	88818637-080c-4c99-ae7d-265f4f7ada85	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:31:29.54796+00
5a50bc35-c776-4283-81d1-43ba62c11028	28c62465-f2c9-4653-adae-0918420f06a3	8ab57ed4-2107-4880-88a5-93e07bc747d0	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:33:06.304521+00
4e6516fc-63f8-4d15-bd22-529014e75d62	28c62465-f2c9-4653-adae-0918420f06a3	bc2344f4-66d6-4dcf-93fa-608871aeb1ba	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:49:21.943493+00
96fb805e-71bc-4e6e-be72-6d81b12b16ba	28c62465-f2c9-4653-adae-0918420f06a3	dca20759-c2ff-496d-8d55-dd9230f92203	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:51:05.163756+00
09c8fded-3b91-465d-ba40-cc4a295ada3b	28c62465-f2c9-4653-adae-0918420f06a3	24704bb6-2908-44a7-8098-4a188b527805	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:53:26.901824+00
ba76bff5-fa62-45a5-a2a7-794d9c405e74	28c62465-f2c9-4653-adae-0918420f06a3	d8aa2361-6122-40a3-9ae2-93792e236825	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:54:15.724199+00
4cf40895-e7d6-4e84-9761-ded28defc7d4	28c62465-f2c9-4653-adae-0918420f06a3	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:56:57.538044+00
8d4ff9e1-5d7b-474e-b356-90d00cea50ce	28c62465-f2c9-4653-adae-0918420f06a3	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-03-28 02:43:16.894234+00
9031e054-5130-4141-85be-5943247044e5	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	660e5db2-b63a-4a80-9e03-61b9676a25f0	06558882-7a10-4b69-b8e0-4fef2684a434	2026-04-04 14:09:28.433412+00
e8dc7a9c-5a2c-4100-9a6b-7e76cf6f51e1	28c62465-f2c9-4653-adae-0918420f06a3	2ce59d73-d507-4df2-8254-b780773e6465	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-05-12 03:17:41.937535+00
64126b9b-b132-44d9-b0eb-564b9fec05eb	e6b29f58-e106-46c6-9eab-a1c2f119493b	2ce59d73-d507-4df2-8254-b780773e6465	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-05-12 03:17:45.208855+00
c8214aa3-fa74-407d-9486-0abfac332a1e	28c62465-f2c9-4653-adae-0918420f06a3	5d100834-5494-4217-ac7c-e02053c4f016	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-06-14 07:29:09.662237+00
1ebaa931-a0b7-40b5-966e-7e5ba650509d	28c62465-f2c9-4653-adae-0918420f06a3	20585b2e-27e7-42c3-87bb-3ddebb856a7d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-08-07 13:24:56.615645+00
\.


--
-- Data for Name: post_videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_videos (id, post_id, video_url, thumbnail_url, duration, file_size, created_at) FROM stdin;
\.


--
-- Data for Name: post_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_views (id, post_id, user_id, viewed_at) FROM stdin;
c9d30d5f-b869-4ff8-9f55-ec1d98f4a8d9	28c62465-f2c9-4653-adae-0918420f06a3	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-21 06:44:05.229557+00
04f92bde-d0de-4767-a55c-bb8f411672d6	28c62465-f2c9-4653-adae-0918420f06a3	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:16:44.309339+00
6eafc429-4864-42a8-907a-a0cd14411823	d41a6dbf-b002-4b46-ac48-f35492f3814d	\N	2026-01-24 02:42:38.068451+00
75ea6401-7deb-48e5-983b-28f4c6473c01	28c62465-f2c9-4653-adae-0918420f06a3	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:45:35.925549+00
7b753511-0283-445a-a6f3-b502df460c7e	e6b29f58-e106-46c6-9eab-a1c2f119493b	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:02:29.643979+00
f498ba05-3c8f-43b4-9d73-e292f21fa2d8	d41a6dbf-b002-4b46-ac48-f35492f3814d	\N	2026-01-24 18:50:44.201736+00
988e141c-68f7-4479-9712-e4c64669a731	e6b29f58-e106-46c6-9eab-a1c2f119493b	a49342a7-3158-433b-a256-172b68d1de57	2026-01-21 09:21:46.935187+00
4692c876-b0fa-479a-9a44-d6eaeab83270	28c62465-f2c9-4653-adae-0918420f06a3	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:29:04.170246+00
0cc1497c-317b-426d-99bd-6a29d1d229d6	d41a6dbf-b002-4b46-ac48-f35492f3814d	9d0ef483-3495-446e-a744-f290c1e4d509	2026-03-25 10:50:06.043928+00
26592d6d-3613-4368-927c-d02111ae9c94	28c62465-f2c9-4653-adae-0918420f06a3	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:10.579346+00
34606f29-edad-4b98-8564-c665d9fa1b07	e6b29f58-e106-46c6-9eab-a1c2f119493b	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:44.740524+00
99749712-fe35-4706-b72d-9d4218367b3e	d41a6dbf-b002-4b46-ac48-f35492f3814d	535c19e9-df3b-46c1-95dc-f93cb3f22afe	2026-01-21 09:40:52.994724+00
6e3dd13e-02cb-46d5-8e60-b38125e10a02	28c62465-f2c9-4653-adae-0918420f06a3	8c016324-b2b4-42b8-a89f-a46687f7e589	2026-01-21 09:53:01.753939+00
20b8123c-8e6d-42a0-a797-6e5a081ebb62	e6b29f58-e106-46c6-9eab-a1c2f119493b	8c016324-b2b4-42b8-a89f-a46687f7e589	2026-01-21 09:53:01.749454+00
02626fc6-1b6c-4eee-b66f-f9dbe5a94624	d41a6dbf-b002-4b46-ac48-f35492f3814d	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:04:26.351101+00
a38f2ddd-12d7-44b7-9a8f-c96fa841c107	d41a6dbf-b002-4b46-ac48-f35492f3814d	8c016324-b2b4-42b8-a89f-a46687f7e589	2026-01-21 09:53:01.8196+00
0c7db559-6b32-464c-a338-f190b86fcfe0	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	02d46548-0441-412d-b12b-f0830a264840	2026-01-21 09:54:20.89854+00
b1b7bc46-e665-41ac-b794-5ddb358a994f	d41a6dbf-b002-4b46-ac48-f35492f3814d	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:30.949663+00
d41bc701-c408-4365-af11-ea7c0f5a11ae	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:47:44.400772+00
592b7047-ee09-4ed4-90a6-b3de9adac859	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	8c6c740c-b564-48ae-9b85-a164e99155fd	2026-01-21 10:22:42.790003+00
b7c3c314-06b2-4b84-b940-6f7c73501094	d41a6dbf-b002-4b46-ac48-f35492f3814d	8c6c740c-b564-48ae-9b85-a164e99155fd	2026-01-21 10:22:43.104263+00
d8ae5750-1de0-4d04-80f7-fe4923178004	28c62465-f2c9-4653-adae-0918420f06a3	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	2026-01-21 10:26:13.433278+00
fa42f30a-c7ac-4070-bcb3-ef1fdd484dae	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:20.386412+00
67508b06-5e95-4065-a8f6-770125e55e8a	d41a6dbf-b002-4b46-ac48-f35492f3814d	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:09.721066+00
31af960a-2749-4b53-bfc4-00fd0aa8240d	28c62465-f2c9-4653-adae-0918420f06a3	8bc0ba75-9312-45a3-9848-b6d2ff53501c	2026-01-21 10:29:01.572837+00
340a915e-a77f-4cd6-b972-cc0518d3dc57	28c62465-f2c9-4653-adae-0918420f06a3	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	2026-01-21 10:31:35.685798+00
871b15a5-7e94-4ef9-af39-3db90a570577	d41a6dbf-b002-4b46-ac48-f35492f3814d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-13 13:38:14.119218+00
91c71e64-af30-4d0b-957d-a0f117124e71	d41a6dbf-b002-4b46-ac48-f35492f3814d	b1294c8d-cc65-480c-92ff-0e23cd927b59	2026-01-13 13:47:47.68031+00
b4ff1b10-2757-4012-a88f-7d35814a7237	28c62465-f2c9-4653-adae-0918420f06a3	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:20.610356+00
498a8568-4424-49fa-af1f-38c3b0a23f92	d41a6dbf-b002-4b46-ac48-f35492f3814d	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-16 06:32:55.406322+00
2c09309b-3e38-4ca0-98bd-1476751a37b0	d41a6dbf-b002-4b46-ac48-f35492f3814d	71db8ee9-f2ce-4548-bf96-dc4dea252445	2026-01-16 06:50:46.181604+00
81937f43-dcd9-4b8d-b251-9cad66b6688d	e6b29f58-e106-46c6-9eab-a1c2f119493b	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-06-09 11:24:57.889114+00
f8292b97-1bc7-4378-8c0e-53392a0c884a	dad214d1-eab3-4cb9-b3a9-45de14b2e778	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:57.411222+00
d1727dcf-12bf-4074-a825-24fea98bce02	d41a6dbf-b002-4b46-ac48-f35492f3814d	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-01-16 06:52:18.250563+00
07e2614a-d0fb-40cc-a396-b261a67cbeb5	d41a6dbf-b002-4b46-ac48-f35492f3814d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-16 06:54:24.316004+00
c3cdaed6-744a-43c4-b623-a303107f851c	28c62465-f2c9-4653-adae-0918420f06a3	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-16 06:58:00.634407+00
53cc3688-b8c8-41c6-89ab-5e037fa719fb	28c62465-f2c9-4653-adae-0918420f06a3	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-01-16 06:58:17.167143+00
51fe0623-ff6b-4f27-aa0a-d9f32f44e653	28c62465-f2c9-4653-adae-0918420f06a3	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-16 07:02:39.928246+00
67d8eefb-50ab-410f-97df-dab4279ab1ee	28c62465-f2c9-4653-adae-0918420f06a3	71db8ee9-f2ce-4548-bf96-dc4dea252445	2026-01-16 07:02:59.020169+00
c30261e2-a449-450c-a7d3-dfadc60230ee	28c62465-f2c9-4653-adae-0918420f06a3	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-16 07:39:13.933321+00
dd20b0f9-f2ff-41de-8a9c-5b63e2622c13	28c62465-f2c9-4653-adae-0918420f06a3	b1294c8d-cc65-480c-92ff-0e23cd927b59	2026-01-16 08:49:25.859864+00
ac727cd8-f60f-45a5-9d7e-455ee9adddbd	28c62465-f2c9-4653-adae-0918420f06a3	02f10e79-87fe-4842-8790-97976769f4fa	2026-01-16 08:50:05.839297+00
b44df068-bf58-4cd9-9834-e026799f8e83	d41a6dbf-b002-4b46-ac48-f35492f3814d	02f10e79-87fe-4842-8790-97976769f4fa	2026-01-16 08:50:05.841643+00
877470bc-1990-48c9-b27a-a5997b711b79	28c62465-f2c9-4653-adae-0918420f06a3	f5e5fb6a-699c-4785-b339-8ebfeb89f890	2026-01-16 09:05:03.002668+00
bb8ad515-7b5b-4908-a494-818954fb02db	d41a6dbf-b002-4b46-ac48-f35492f3814d	f5e5fb6a-699c-4785-b339-8ebfeb89f890	2026-01-16 09:05:03.017489+00
c9e0b2e9-4615-494d-b625-13fa46e2050d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:46.032292+00
68ebe42a-300b-4d7f-970d-ac8631167606	d41a6dbf-b002-4b46-ac48-f35492f3814d	1993de5f-2df4-4232-bdaf-96681211700f	2026-01-16 15:23:51.765746+00
722be8f9-2db2-4986-a966-abcc3b3346b1	28c62465-f2c9-4653-adae-0918420f06a3	1993de5f-2df4-4232-bdaf-96681211700f	2026-01-16 15:23:52.086822+00
74637011-5b59-4f21-abb8-c21c3528d161	d41a6dbf-b002-4b46-ac48-f35492f3814d	6c836d7e-cf23-4001-bf1f-e9b6ee09de2d	2026-01-16 16:32:10.823902+00
fc252391-e5d6-4c5b-b021-3b3decab4354	28c62465-f2c9-4653-adae-0918420f06a3	6c836d7e-cf23-4001-bf1f-e9b6ee09de2d	2026-01-16 16:32:10.827979+00
45261a42-a72a-46bc-8d30-4cdd76d20e5e	28c62465-f2c9-4653-adae-0918420f06a3	79e0fa0b-9ca6-433a-925c-689801a402c7	2026-01-16 16:35:34.095127+00
b8af14ed-789d-40dc-b3de-210210ec3aab	d41a6dbf-b002-4b46-ac48-f35492f3814d	79e0fa0b-9ca6-433a-925c-689801a402c7	2026-01-16 16:35:34.40206+00
51a83fe8-80fa-4238-a024-dffb73fb7dcc	28c62465-f2c9-4653-adae-0918420f06a3	0ee6e332-1888-4b58-8c1b-6d67fe44a59b	2026-01-16 16:45:17.400085+00
c9c4c4e5-0b55-48ea-9f9b-0fb4eff34dbb	d41a6dbf-b002-4b46-ac48-f35492f3814d	0ee6e332-1888-4b58-8c1b-6d67fe44a59b	2026-01-16 16:45:17.41507+00
d82558ee-246d-4c87-962a-7c91a6fc14f6	28c62465-f2c9-4653-adae-0918420f06a3	d7b8b6cd-75cf-4324-b3ce-975a95849477	2026-01-16 17:15:31.901499+00
22a58058-8ae7-490d-8f7a-56d97390cf0a	d41a6dbf-b002-4b46-ac48-f35492f3814d	d7b8b6cd-75cf-4324-b3ce-975a95849477	2026-01-16 17:15:32.513262+00
300b8d2e-b9df-42ee-b839-f5edb8ccba8f	d41a6dbf-b002-4b46-ac48-f35492f3814d	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-21 06:44:05.242074+00
caf76bb6-d347-4677-bb28-f1d0182201bd	e6b29f58-e106-46c6-9eab-a1c2f119493b	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:16:44.315673+00
9a44a4de-f3c5-423c-86e6-11eb841c1f0a	d41a6dbf-b002-4b46-ac48-f35492f3814d	4ee915ec-4c50-4adf-9650-ea4ee740210f	2026-01-24 03:15:11.099201+00
262e4f25-e1bb-41e8-97d1-e193cd5c1479	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:02:29.644988+00
2a6f5482-b7f8-4abc-9963-f90699f42ee3	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	36597eb2-1818-4c3f-b98e-6ba968c77dc4	2026-01-21 09:06:48.86987+00
02c78a91-e333-4b95-94df-cfe8152de4cf	28c62465-f2c9-4653-adae-0918420f06a3	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:11:05.261172+00
a9aacd16-4206-4f73-900b-795b5d0057eb	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4ee915ec-4c50-4adf-9650-ea4ee740210f	2026-01-24 03:15:11.103975+00
0c481f88-a381-4aa5-a6a9-9b9c1a8c571c	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:45.424538+00
a70f90d6-a603-461f-b5cb-8ac61f3c0453	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	535c19e9-df3b-46c1-95dc-f93cb3f22afe	2026-01-21 09:40:52.996359+00
a72c5346-55e4-420e-b323-080a0a590cb8	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	8c016324-b2b4-42b8-a89f-a46687f7e589	2026-01-21 09:53:01.771101+00
6739a9c7-66d8-45bb-b2d8-13b910acf9d9	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	02d46548-0441-412d-b12b-f0830a264840	2026-01-21 09:54:20.958647+00
f28e387c-5d14-4f3f-90f1-d307f58c1119	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	98ebcbeb-44cb-4d6f-89d4-34ec32ef48b8	2026-02-06 14:32:39.868078+00
a5565a23-dd2d-41ec-a2b4-10fe60b0899f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:08.861696+00
fc14a1a9-470a-4e6a-bacd-d14e76945bad	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	2026-01-21 10:26:13.432065+00
50fba728-a19f-46c2-ac5f-a1a2a07fd830	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:09.386984+00
b7724a10-e29e-43a8-9ecd-8e17432072e1	28c62465-f2c9-4653-adae-0918420f06a3	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:09.714286+00
5de947ad-af69-4edc-861f-a510a5a12fee	5133c21a-fcf7-4021-8bcb-448a3586408d	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-03-24 14:45:14.574991+00
bfa62ab3-ed10-49d6-a7d2-c81fa4084eb4	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:17:51.497612+00
c99baa44-7f5f-4536-93c3-56a733e80e5b	d41a6dbf-b002-4b46-ac48-f35492f3814d	766613de-ab18-45a2-9c57-ab6e838c91aa	2026-01-21 10:34:40.837968+00
420eb79f-e173-4f6e-8e3c-d2c06e67221f	e6b29f58-e106-46c6-9eab-a1c2f119493b	d4e15dfe-84c9-489a-997f-4303eb9de453	2026-01-21 12:17:53.863809+00
3c8627e1-7cec-4524-ab48-91c57a44aba4	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:04:26.339135+00
4003287d-a97d-4084-953d-264eca406dfd	28c62465-f2c9-4653-adae-0918420f06a3	511c3f9d-9125-4586-b351-45348ad11743	2026-01-22 00:35:08.072341+00
173c696a-ceef-4a76-a531-31fb095a7e42	d41a6dbf-b002-4b46-ac48-f35492f3814d	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:43.85763+00
13eb17ce-1bc2-438e-8baf-d6533abf1a0f	e6b29f58-e106-46c6-9eab-a1c2f119493b	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	2026-04-02 11:14:54.841667+00
d0d0f83e-88ac-4e64-8da0-c9458ee1a1ce	28c62465-f2c9-4653-adae-0918420f06a3	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:45:55.151953+00
d66e1b62-7079-40e9-b8c6-41b665a0d9e0	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	2026-01-22 00:50:53.118599+00
0e84e91a-7b97-4557-893e-aba2a24cce73	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	fc6c6611-60cb-44d8-8de7-613f7d7869b5	2026-01-22 00:52:02.976609+00
52abbe5c-d00f-47f9-aebf-d54c72ad197b	e6b29f58-e106-46c6-9eab-a1c2f119493b	c801a58c-8dde-4ff0-9193-cd33de0e1e03	2026-01-22 01:00:48.146809+00
6ea6e94e-6e61-4f38-b737-5403276d9dae	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c801a58c-8dde-4ff0-9193-cd33de0e1e03	2026-01-22 01:00:48.189981+00
93919036-1de3-4a1a-af66-6b7bc52694ec	d41a6dbf-b002-4b46-ac48-f35492f3814d	c801a58c-8dde-4ff0-9193-cd33de0e1e03	2026-01-22 01:00:48.225799+00
60c0c8a6-05a9-439d-b172-b024f573b608	e6b29f58-e106-46c6-9eab-a1c2f119493b	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	2026-01-22 01:04:07.01443+00
58be3da6-cbac-4422-8e5a-323c1f483205	e6b29f58-e106-46c6-9eab-a1c2f119493b	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	2026-01-22 01:13:27.892656+00
796a2449-97c0-4cb5-8330-ba2159f32c2b	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	2026-01-22 01:13:27.934434+00
040c8300-559d-45c1-91f7-220ef371636e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	2026-04-02 11:14:54.842252+00
0bb00e64-d0dc-4fba-aabf-d256096392f7	28c62465-f2c9-4653-adae-0918420f06a3	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	2026-04-02 11:14:54.83934+00
7c8ac14f-76cf-4a02-ba65-b837b5342190	28c62465-f2c9-4653-adae-0918420f06a3	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:18:45.616605+00
2b769f7c-c5e7-4c3b-86b2-278396eee219	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:47:44.411389+00
c27bb6f5-a467-4734-b452-45ca089da7e3	d41a6dbf-b002-4b46-ac48-f35492f3814d	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:20.493274+00
12e105f8-164c-47e0-b0f7-91d8b3a238b0	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	2026-01-22 01:26:02.125566+00
44ad695d-f775-4f81-80b3-84062d7b4646	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 03:17:38.263826+00
f34742fe-663a-463d-8423-9aa29141854f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:17.573234+00
2dabf991-4ff2-457d-892b-ba8f4b089635	28c62465-f2c9-4653-adae-0918420f06a3	5981f73f-c8eb-46ca-97cf-61bb2373bc52	2026-01-22 01:38:42.170769+00
5c9da702-b476-4083-bc95-a887040056b4	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4733c4f2-b333-4f33-8526-490f50a57499	2026-01-22 01:39:45.172812+00
33a755fb-1505-400c-bd49-fe5146309fc7	e6b29f58-e106-46c6-9eab-a1c2f119493b	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-05 16:17:32.030327+00
6a8340a5-c5db-4b7a-a57d-b5fca4ad492e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-06-09 11:24:57.894685+00
29308580-5939-4905-b18b-a16696f50a4f	e6b29f58-e106-46c6-9eab-a1c2f119493b	29573c2b-fdf5-4831-974c-9851cb4d9fc3	2026-01-22 01:46:59.253367+00
0fcdaae4-8ff0-4a29-8784-8d1e56021e56	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	2026-01-22 01:52:17.059324+00
d1f5ca6d-bfe9-45da-a48e-97ef7d1307cb	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	2026-01-22 01:52:17.252213+00
25116cee-d193-4276-b3b7-db4a1c0761f3	28c62465-f2c9-4653-adae-0918420f06a3	\N	2026-08-07 13:23:48.438365+00
23bcfecb-a20a-4fcc-9298-e7f65fd58059	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:24:41.766027+00
88dd0cfd-b611-4e3f-beae-f601a028bc9d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-05 12:31:33.9142+00
8e4a28d2-7baa-4cd6-a790-e30d75e1e353	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	ae856958-69bf-432e-bab2-262340b92e0d	2026-01-22 01:58:39.441696+00
bfde5fb1-55cc-4a51-b357-6c5def01a230	28c62465-f2c9-4653-adae-0918420f06a3	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:04:29.660896+00
1a7da94a-232f-4d0b-9ad8-7b0be811090b	d41a6dbf-b002-4b46-ac48-f35492f3814d	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	2026-01-22 02:09:19.612901+00
71d34221-e128-4ccb-909f-0feecd5a763e	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	3f43944a-64de-489a-aac4-7564b6367304	2026-01-22 02:14:08.565316+00
1186fd1e-52f5-4d5b-9bcc-776979179ef5	d41a6dbf-b002-4b46-ac48-f35492f3814d	3f43944a-64de-489a-aac4-7564b6367304	2026-01-22 02:14:08.923737+00
8db74985-f2b6-4ab6-b188-ecd8cb047c65	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	2026-01-22 02:15:17.907262+00
72683efd-cada-4223-967c-0a38fb049981	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	2026-01-22 02:17:33.051777+00
c56a4567-20cd-4dd1-9eb2-9499eb37506e	d41a6dbf-b002-4b46-ac48-f35492f3814d	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	2026-01-22 02:18:53.633662+00
1ae3b057-581b-4ddc-a914-74d109089672	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	a3f52365-5616-4ae8-8b9d-dfba52c94270	2026-01-22 02:20:10.817231+00
5da666e8-c8e4-419b-b4a8-403978d21e44	d41a6dbf-b002-4b46-ac48-f35492f3814d	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:21:45.316277+00
ce742568-e6a7-4896-9e72-b94ec1d5f8aa	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:21:45.655187+00
9fe10846-6642-4cec-8d85-41e05195ca95	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4104824d-4aaa-4ce4-b304-d1074d61fba6	2026-01-22 03:11:53.926921+00
c33122a4-a525-4322-ad4f-7ec8a062a190	28c62465-f2c9-4653-adae-0918420f06a3	4104824d-4aaa-4ce4-b304-d1074d61fba6	2026-01-22 03:11:54.279407+00
6da277b3-ebbf-4ec4-b26b-8303f9fa7c50	d41a6dbf-b002-4b46-ac48-f35492f3814d	6d277ecb-1abf-4361-b0c3-0948f3b8d234	2026-01-22 03:16:57.160779+00
736c919b-533c-4cc6-923e-71cd60f0c71a	d41a6dbf-b002-4b46-ac48-f35492f3814d	7646b385-d2e4-4b95-acc5-c816e3cd1412	2026-01-22 03:18:28.546924+00
229ca8e1-f6be-421f-81d2-ac10b81d140b	d41a6dbf-b002-4b46-ac48-f35492f3814d	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	2026-01-22 03:19:53.02809+00
cd7d387a-1572-4758-9511-457629bfbc1e	28c62465-f2c9-4653-adae-0918420f06a3	35dca33b-9d87-448c-80f5-a93eb0940c7f	2026-01-22 03:22:24.864336+00
9d96ace9-3455-437f-b4e3-66780f972ef2	e6b29f58-e106-46c6-9eab-a1c2f119493b	35dca33b-9d87-448c-80f5-a93eb0940c7f	2026-01-22 03:22:25.061808+00
9dc19da3-a3ab-4307-bff3-c7ae013d9da3	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	9ec8512b-24ba-4581-a362-6f7a3a6c0235	2026-01-22 03:24:07.855182+00
3c650c9b-e0b4-4563-80f5-a9a3cf51b790	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	9ec8512b-24ba-4581-a362-6f7a3a6c0235	2026-01-22 03:24:07.875656+00
05961af0-f59c-424c-a8b4-f68259540c04	28c62465-f2c9-4653-adae-0918420f06a3	4ee915ec-4c50-4adf-9650-ea4ee740210f	2026-01-24 03:15:11.112184+00
73a4d221-1e74-4d4a-8fc2-8797f9a31d75	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:16:44.316657+00
36c04066-6d5f-4313-b0b1-5eed6f8a8e66	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:53:39.458644+00
6d3c156e-6f44-4f1a-aec9-6e21d47ac146	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:35.086582+00
af409711-c2dd-4b20-ac67-71ae25042104	28c62465-f2c9-4653-adae-0918420f06a3	\N	2026-01-25 03:42:15.944854+00
fa3475fc-bfb1-46a3-b922-4b9762bc6bcf	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:12.317691+00
bec50c94-e001-458a-8e2d-a110ab3c3659	28c62465-f2c9-4653-adae-0918420f06a3	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:15:48.069652+00
f695642d-b0aa-497b-ab99-fea6f7df0649	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	a49342a7-3158-433b-a256-172b68d1de57	2026-01-21 09:21:46.930513+00
1d0748e7-1e79-4939-bfbe-26ac3842af67	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:29:04.240691+00
33c19e1f-f800-4eef-831d-e8bad6ca6304	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:10.585314+00
23e8485a-3446-49ec-8f6b-93851122068c	d41a6dbf-b002-4b46-ac48-f35492f3814d	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:45.44209+00
89b4e7b4-aea6-4997-b6ea-f7fba27b74fa	e6b29f58-e106-46c6-9eab-a1c2f119493b	535c19e9-df3b-46c1-95dc-f93cb3f22afe	2026-01-21 09:40:53.019242+00
fd7ccfce-4652-43a8-a1cc-2828f7ae7032	28c62465-f2c9-4653-adae-0918420f06a3	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:30.959111+00
62e11f5a-79be-40d5-abfb-6b0822c92207	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:31.144421+00
1f8e3635-8ae9-4454-b528-3a3941ce277e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:13.788801+00
5c754d43-6c76-47c2-8ca8-1016b5e26aab	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	2026-01-21 10:26:13.426491+00
eb327679-0666-485c-80d6-113ceb170535	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:08.876189+00
a9e5ee9c-00d2-466f-b69d-9a8961a49c30	d41a6dbf-b002-4b46-ac48-f35492f3814d	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:09.385619+00
90ada8f7-073b-4404-97a7-a278e94c44e1	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4c9b06d2-6e48-490f-9aca-827a7b94d76b	2026-01-21 10:33:45.227496+00
c4b2f345-8856-48e0-bcca-cb2a6d9743b3	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	766613de-ab18-45a2-9c57-ab6e838c91aa	2026-01-21 10:34:40.844472+00
41d2c086-f75e-48c4-a07b-767d84276ef5	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:55:34.571888+00
575000f8-5059-4f0b-b79c-54e624e189a3	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	511c3f9d-9125-4586-b351-45348ad11743	2026-01-22 00:35:08.071322+00
4cd4e1a2-103b-4219-b336-170d6c482e8d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:43.841701+00
47584cd2-aeaf-486c-8edc-cc89bd3e789d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	50644fc3-8363-44f2-836e-61b3a252478d	2026-01-22 00:41:41.163351+00
1e5c1865-b97f-408b-8471-8ba0d2e31994	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:45:55.024242+00
f84f89e5-1281-4e42-8501-58ff264dbf7e	e6b29f58-e106-46c6-9eab-a1c2f119493b	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:17:51.50354+00
f2d5d8d9-478a-4736-9159-2090f9853ef5	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:04:26.358508+00
b41705d0-21d9-4788-8dc7-30ef6b00e21c	d41a6dbf-b002-4b46-ac48-f35492f3814d	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	2026-01-22 00:50:53.120746+00
272c6ee1-c8a8-402f-b349-e4e5570d1bd3	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	2026-04-02 11:14:55.120787+00
62e6eff0-0f2f-44e2-a403-1d44c6df9cc0	e6b29f58-e106-46c6-9eab-a1c2f119493b	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:47:44.4116+00
b33ce485-0f64-4f09-aff8-0707225aa272	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	2026-01-22 01:04:07.018482+00
370b3ed6-f25a-4169-8c83-4094238d504c	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	24027bca-5ea0-4b84-bbef-86cfe6eaf976	2026-01-22 01:04:15.494058+00
d5396ae1-6387-480a-80a0-b9e5ad6b6a55	d41a6dbf-b002-4b46-ac48-f35492f3814d	24027bca-5ea0-4b84-bbef-86cfe6eaf976	2026-01-22 01:04:15.768365+00
c758be32-988d-4089-9753-43b65f01aac6	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:20.597343+00
db2fa036-133d-41ac-a481-4f78e8cd297e	d41a6dbf-b002-4b46-ac48-f35492f3814d	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	2026-01-22 01:13:27.934208+00
6217d899-f7d9-45ad-846a-3e4c1d9b325f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	1919a069-3c62-4408-9f6b-aba65bbdcce7	2026-01-22 01:16:43.214036+00
c119aeea-cdf1-40aa-a56a-639657db89b3	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	2026-01-22 01:19:52.928997+00
c43dfc34-b31f-4b18-91b9-ecc40002ca8e	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 03:17:38.264158+00
083e808e-167b-4668-bb97-7d9bfa5391f9	28c62465-f2c9-4653-adae-0918420f06a3	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 03:17:38.535071+00
6051c013-2cf8-4e3a-807b-c580135fd9ea	e6b29f58-e106-46c6-9eab-a1c2f119493b	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	2026-01-22 01:24:25.876276+00
c8cbab47-8699-4b54-8250-167dde76f033	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-05 16:17:32.024542+00
a2cd0712-3f0f-4c2b-a432-2c07396f3df7	e6b29f58-e106-46c6-9eab-a1c2f119493b	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	2026-01-22 01:26:02.125593+00
fc0ba30b-35ec-4a61-9e8e-d34e13375766	28c62465-f2c9-4653-adae-0918420f06a3	\N	2026-06-09 15:15:12.025239+00
1ce3049a-04b5-4cc7-90e8-012734e5c8d5	e6b29f58-e106-46c6-9eab-a1c2f119493b	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:17.546431+00
fe296b54-ee03-44d7-9e06-a18860a53897	0e7f3286-8516-4931-a1e1-32bfd0ca63fe	\N	2026-08-07 13:23:48.442482+00
24fda40a-41fa-4ece-bb62-c942b66d6397	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	5981f73f-c8eb-46ca-97cf-61bb2373bc52	2026-01-22 01:38:42.528298+00
7440514c-59fb-4ec6-bc4c-ea95397933a0	d41a6dbf-b002-4b46-ac48-f35492f3814d	4733c4f2-b333-4f33-8526-490f50a57499	2026-01-22 01:39:45.221262+00
faa7551c-b244-4f8a-a216-cc1d8d328fef	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:24:41.763044+00
025e9c51-32d6-4258-930e-a0d822d88140	e6b29f58-e106-46c6-9eab-a1c2f119493b	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-05 12:31:33.949392+00
cdc16bab-4cd7-44e5-8ca7-6f8ee96e5bac	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	2026-01-22 01:50:10.309697+00
5c448e54-62ea-4525-ae0a-39684b8dc238	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	b9163fcb-75ec-4a35-8d45-1547315401ac	2026-01-22 01:53:21.708576+00
78bc041f-9313-4396-8e49-878e48c431c2	28c62465-f2c9-4653-adae-0918420f06a3	b9163fcb-75ec-4a35-8d45-1547315401ac	2026-01-22 01:53:21.74599+00
5b0c85ca-53ae-4eb6-a8f9-52b507b1d312	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-22 01:54:37.363318+00
53505798-3ab7-4eb7-a25b-044e5898aa42	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	ae856958-69bf-432e-bab2-262340b92e0d	2026-01-22 01:58:38.531033+00
af0d324a-b899-495c-8ff9-b5d0ddabbf16	28c62465-f2c9-4653-adae-0918420f06a3	ae856958-69bf-432e-bab2-262340b92e0d	2026-01-22 01:58:39.429602+00
11d23f74-1576-4d0f-b2e4-008edcfcace7	d41a6dbf-b002-4b46-ac48-f35492f3814d	ae856958-69bf-432e-bab2-262340b92e0d	2026-01-22 01:58:39.450508+00
1e90883d-2cb4-4644-9ecd-2c14164374cf	28c62465-f2c9-4653-adae-0918420f06a3	2f835397-40fb-430f-96bb-3b23e988950e	2026-01-22 02:00:36.558395+00
0dcb84f9-8b1a-4383-8f0f-d3dbfa74b83c	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:04:29.678086+00
f54af28f-f3fe-4793-9176-19d82b18f72a	e6b29f58-e106-46c6-9eab-a1c2f119493b	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	2026-01-22 02:11:16.781794+00
751f9402-d011-4289-b015-acea2fb63564	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	143a5beb-1342-40f7-b9ef-3431b4c44da4	2026-01-22 02:12:27.658082+00
4fb181f3-64b7-4c17-986c-faa9145b3759	e6b29f58-e106-46c6-9eab-a1c2f119493b	3f43944a-64de-489a-aac4-7564b6367304	2026-01-22 02:14:08.571216+00
eb1487aa-0b9b-4361-9142-9762d5622cf5	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	3f43944a-64de-489a-aac4-7564b6367304	2026-01-22 02:14:08.861047+00
08b201e5-5d7e-4ada-ae86-169c9cce71c6	e6b29f58-e106-46c6-9eab-a1c2f119493b	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	2026-01-22 02:15:17.916585+00
ff851150-f76d-4126-ae2d-1c912e9c05b2	e6b29f58-e106-46c6-9eab-a1c2f119493b	9a92b411-973c-485e-9572-541a3989be22	2026-01-22 02:16:22.751351+00
20eae72c-2b7b-45a6-a6dd-d48571a7a3e1	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	2026-01-22 02:17:33.053897+00
b5ba1fdf-09fe-44e7-b974-9c1e021f9e9e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	a3f52365-5616-4ae8-8b9d-dfba52c94270	2026-01-22 02:20:10.822057+00
a18c861b-14b6-4dc8-a167-ff78718c0cac	e6b29f58-e106-46c6-9eab-a1c2f119493b	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	2026-01-22 03:09:08.290375+00
ba398086-c4b6-450e-a94c-47daa7115246	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	2026-01-22 03:09:08.295852+00
f76ece45-50e2-4b9a-a22f-e6038243ff9f	28c62465-f2c9-4653-adae-0918420f06a3	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	2026-01-22 03:09:08.298396+00
b7aa3dfc-de28-4ff8-a233-d27fbead958e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	2026-01-22 03:09:08.635485+00
beba135a-7943-4f6f-a88f-fe2f754950aa	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	2026-01-22 03:13:13.571033+00
a34a1369-ab35-4dae-893e-e7f6a21ff6e9	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	6fb4e6fd-e573-4551-8480-91aaa0d63b80	2026-01-22 03:14:43.044939+00
88fd9efa-df19-46be-94f9-f38766a2afaf	28c62465-f2c9-4653-adae-0918420f06a3	6fb4e6fd-e573-4551-8480-91aaa0d63b80	2026-01-22 03:14:43.071703+00
a34e70ff-7500-490a-832a-be27cc4fc5b0	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-21 06:44:05.242744+00
78ac771b-6abf-4a62-b22d-de6897858de1	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	71db8ee9-f2ce-4548-bf96-dc4dea252445	2026-01-21 08:07:38.988058+00
8234c9ed-e990-44df-ab2b-c4c31e2205ee	e6b29f58-e106-46c6-9eab-a1c2f119493b	98ebcbeb-44cb-4d6f-89d4-34ec32ef48b8	2026-02-06 14:32:39.912835+00
dd967f12-d251-4911-943c-8bf70524168b	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	98ebcbeb-44cb-4d6f-89d4-34ec32ef48b8	2026-02-06 14:32:40.179218+00
e1c0c89a-337c-45ed-af51-348f6014753c	e6b29f58-e106-46c6-9eab-a1c2f119493b	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:12.334811+00
f493cc67-8e79-40a0-8a47-a73a372e9913	d41a6dbf-b002-4b46-ac48-f35492f3814d	532e3227-3b29-42de-b1c2-317510d0b559	2026-01-17 09:32:26.001922+00
ebc3c928-b465-4949-aa1c-33007d87777c	28c62465-f2c9-4653-adae-0918420f06a3	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:08.902766+00
bd3537c4-1177-41be-b14c-9c6e45e0235c	d41a6dbf-b002-4b46-ac48-f35492f3814d	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:55:34.769278+00
37529c7e-5743-410d-8cb2-57f6d63909df	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:15:47.885584+00
a46f4255-bfee-44ea-8471-736cbfdc8c09	28c62465-f2c9-4653-adae-0918420f06a3	532e3227-3b29-42de-b1c2-317510d0b559	2026-01-17 09:32:26.015682+00
f885a73d-521d-4e7e-bf54-5d6516938359	d41a6dbf-b002-4b46-ac48-f35492f3814d	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:17:51.532912+00
7bf47eaa-dffd-418d-8748-760b45af45ca	e6b29f58-e106-46c6-9eab-a1c2f119493b	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:29:04.211082+00
153e1831-b349-4eb1-b68c-c65d331f90a5	28c62465-f2c9-4653-adae-0918420f06a3	dd5e2f80-2fb3-45ac-9e38-b7a054f820cd	2026-01-17 09:53:47.967699+00
0523ac36-5157-4c13-b02d-2aff7b65926c	e6b29f58-e106-46c6-9eab-a1c2f119493b	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:04:26.360088+00
da557992-229a-4e05-88f0-ab624f6a0ce9	d41a6dbf-b002-4b46-ac48-f35492f3814d	b7215524-a4d6-4661-a7c3-83643d53bc8d	2026-01-21 09:44:49.145155+00
797b9600-dc9d-4c54-989c-acee65efa92a	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	2026-04-02 11:14:55.121862+00
54b7aad0-fd4b-46ba-a13f-d61eaf3bbf0a	d41a6dbf-b002-4b46-ac48-f35492f3814d	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:47:44.421155+00
d2f530af-2a0e-491d-b23d-c32ed8e64228	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:09.220339+00
bb27b188-e386-4bc2-95ea-b7fb84dde802	d41a6dbf-b002-4b46-ac48-f35492f3814d	dd5e2f80-2fb3-45ac-9e38-b7a054f820cd	2026-01-17 09:53:48.020911+00
a4855ec0-3ce8-4547-b662-4af1d6e09d25	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8c016324-b2b4-42b8-a89f-a46687f7e589	2026-01-21 09:53:01.794924+00
ce66b356-6a7d-403a-9ca9-aa60b098b9c5	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	bf7fddef-097c-4ab3-902c-1518c74a15cf	2026-01-21 09:55:51.794367+00
ecd8d13d-78e3-4786-b115-d3ddfb4d6a4d	28c62465-f2c9-4653-adae-0918420f06a3	bf7fddef-097c-4ab3-902c-1518c74a15cf	2026-01-21 09:55:52.010276+00
a3229715-ac34-4af2-854d-9f5d0e4e52d5	e6b29f58-e106-46c6-9eab-a1c2f119493b	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:31.152917+00
839252b9-1b53-48ef-90ea-28df078c7134	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:13.57113+00
97aeece6-584a-47f7-b6fe-8a06d1be1dee	d41a6dbf-b002-4b46-ac48-f35492f3814d	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:09.473402+00
516bafa0-43a6-4a89-a770-504e80548619	d41a6dbf-b002-4b46-ac48-f35492f3814d	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:13.860381+00
3524b2d2-fdb5-4166-b698-7cb2ee1cd459	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	2026-01-21 10:26:13.457393+00
7ae3199b-b955-44ca-8d01-0ef65dd935d2	d41a6dbf-b002-4b46-ac48-f35492f3814d	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	2026-01-21 10:27:18.812397+00
3f013cb5-acd8-44d1-8b60-e8cd51a7dcee	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	ab956951-8ac0-4c28-9c8c-0a76af78c939	2026-01-21 10:30:07.950956+00
97410c24-7f0f-481b-97bb-fd5c11cf870a	28c62465-f2c9-4653-adae-0918420f06a3	ab956951-8ac0-4c28-9c8c-0a76af78c939	2026-01-21 10:30:08.016767+00
4b79cb7c-ec12-418a-b113-ae3f8e57d141	e6b29f58-e106-46c6-9eab-a1c2f119493b	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	2026-01-21 10:31:35.924183+00
42523d1d-62ce-4a19-9324-7c763dfaf839	28c62465-f2c9-4653-adae-0918420f06a3	4c9b06d2-6e48-490f-9aca-827a7b94d76b	2026-01-21 10:33:45.234745+00
ed778fb8-cd1d-4d4b-b71e-86b990b29e22	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	a180426f-c6d9-4ed7-b56b-c299364d2c4f	2026-01-21 10:46:45.716169+00
c83d6cc0-c4ec-48bb-9b89-87b3a0244129	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 03:17:38.26385+00
0911fd58-0c66-4642-b579-2457c8f219fc	28c62465-f2c9-4653-adae-0918420f06a3	5c3064f4-3ab8-41d9-a362-07f2bcc5ddd3	2026-01-17 10:20:49.498925+00
032c0a6b-952c-489d-af5c-e7eba158d452	d41a6dbf-b002-4b46-ac48-f35492f3814d	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-05 16:17:32.051536+00
4904cc0b-8d1e-455b-9a35-265ab70032e3	e6b29f58-e106-46c6-9eab-a1c2f119493b	a180426f-c6d9-4ed7-b56b-c299364d2c4f	2026-01-21 10:46:45.724663+00
c4eea337-bb28-4f9b-8805-ae90a5feac78	d41a6dbf-b002-4b46-ac48-f35492f3814d	5c3064f4-3ab8-41d9-a362-07f2bcc5ddd3	2026-01-17 10:20:49.49687+00
962e495d-03f2-4444-b22e-97c628c79b9f	dad214d1-eab3-4cb9-b3a9-45de14b2e778	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-06-09 15:27:11.264836+00
cc74f515-8f62-4468-b2e8-3275726f35de	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	a180426f-c6d9-4ed7-b56b-c299364d2c4f	2026-01-21 10:46:45.720929+00
2c282d01-a5e7-4332-b342-25fb393c7d78	e6b29f58-e106-46c6-9eab-a1c2f119493b	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:24:41.761443+00
c098778d-e1f8-415f-986b-9a515ed4902d	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	d4e15dfe-84c9-489a-997f-4303eb9de453	2026-01-21 12:17:53.887073+00
d3c74114-2aff-4931-8b91-dc9bed471e5c	dad214d1-eab3-4cb9-b3a9-45de14b2e778	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:24:41.760571+00
b9539e3c-1494-44ac-97e3-dcc8d0730dfc	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:43.864957+00
84bc49f6-21d3-410f-95d7-cb3d8f048951	d41a6dbf-b002-4b46-ac48-f35492f3814d	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:42:48.546625+00
41d7f124-3018-473e-8ac3-22188c5dc1fa	d41a6dbf-b002-4b46-ac48-f35492f3814d	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	2026-01-22 00:44:02.785817+00
76151bf9-e40d-4948-aa56-4292bd38818f	28c62465-f2c9-4653-adae-0918420f06a3	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:24:41.770145+00
280dd883-bea6-446f-8d2d-9a48a74f154c	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:24:41.759341+00
cf66de8a-85a8-49aa-bba3-1536a38f9dc3	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-05 12:31:33.947912+00
41de2128-a8c7-467d-bd87-3f1b0611400a	28c62465-f2c9-4653-adae-0918420f06a3	becff985-c6d5-4413-8bc9-4ef86fa5ac52	2026-01-17 10:28:26.387171+00
287029fd-ffca-4049-a2e8-1ca5192a6f06	d41a6dbf-b002-4b46-ac48-f35492f3814d	becff985-c6d5-4413-8bc9-4ef86fa5ac52	2026-01-17 10:28:26.405551+00
34bc5cc0-da95-4911-930a-b07ad7278261	e6b29f58-e106-46c6-9eab-a1c2f119493b	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	2026-01-22 00:50:53.081558+00
1a2b3dcb-e0bc-4cd5-91a3-b6c0014fac24	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	2026-01-22 00:50:53.127071+00
10e68577-0e71-4e0e-a407-10e78a683a4d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	fc6c6611-60cb-44d8-8de7-613f7d7869b5	2026-01-22 00:52:03.001585+00
45dce245-7e39-4869-90c0-177a0ec68b4d	28c62465-f2c9-4653-adae-0918420f06a3	c801a58c-8dde-4ff0-9193-cd33de0e1e03	2026-01-22 01:00:48.219029+00
52e017d7-fa05-435a-9524-9954fd340215	28c62465-f2c9-4653-adae-0918420f06a3	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	2026-01-22 01:04:07.017118+00
b09003fa-d33b-42b2-9f90-605f4dcd8b3a	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	d40eddeb-94f1-4a8e-b05e-f8a02843b691	2026-01-22 01:12:20.0551+00
c7bf5bd7-8f76-4e24-b164-f79b4de795ea	28c62465-f2c9-4653-adae-0918420f06a3	df685ac0-6065-4547-80f1-71997bc5684e	2026-01-17 10:37:23.213659+00
99b9a78e-0108-407e-ae3f-38355bd093a7	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	2026-01-22 01:13:27.893072+00
8cb1a339-320c-4f73-8ae4-2bb22928faf6	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	2026-01-22 01:19:52.934187+00
91a32900-66a0-4fd4-9b97-2a5048938ec3	d41a6dbf-b002-4b46-ac48-f35492f3814d	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	2026-01-22 01:19:52.966775+00
f38571c7-738e-4beb-a85f-a86f3241600c	28c62465-f2c9-4653-adae-0918420f06a3	761258bd-d832-4b3e-8f14-bb8e3f934d26	2026-01-22 01:21:18.069427+00
e534b11a-4c18-4139-9cd8-87e2255dfa15	d41a6dbf-b002-4b46-ac48-f35492f3814d	df685ac0-6065-4547-80f1-71997bc5684e	2026-01-17 10:37:23.227313+00
45adcd49-0caa-410f-b67a-7dd62b3c6c90	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	2026-01-22 01:24:25.578907+00
18b35c71-45c2-49c9-9d35-84661d5812fa	28c62465-f2c9-4653-adae-0918420f06a3	65b54fdc-6983-4242-8b99-823e47f3a0a7	2026-01-22 01:27:27.823917+00
af0043f9-fd95-47e4-845d-35c03f8f7437	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:17.550796+00
522cd54d-96ca-40a1-b22e-c681819542ab	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	5981f73f-c8eb-46ca-97cf-61bb2373bc52	2026-01-22 01:38:42.516655+00
e68d0eab-e4a4-4ab5-a74f-271fd9086a49	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	d28140c0-4739-4adb-b40c-dad97b2551bd	2026-01-22 01:44:51.31222+00
1cb9844b-411c-4cde-b92b-5f283fd9c272	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	29573c2b-fdf5-4831-974c-9851cb4d9fc3	2026-01-22 01:46:59.272162+00
7aa6b7f4-4fed-4b16-9380-f2fbddae725d	e6b29f58-e106-46c6-9eab-a1c2f119493b	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	2026-01-22 01:55:50.728516+00
9db087a9-5a34-4451-937b-4e08fef33e3f	28c62465-f2c9-4653-adae-0918420f06a3	9ce9ba21-e14e-45b9-b634-72c14b65f1ec	2026-01-17 10:42:31.382933+00
f6750d03-418c-4aa4-a782-19603cb9ef6f	d41a6dbf-b002-4b46-ac48-f35492f3814d	9ce9ba21-e14e-45b9-b634-72c14b65f1ec	2026-01-17 10:42:31.386746+00
ab68735d-1121-4560-9384-2fa5972007ed	e6b29f58-e106-46c6-9eab-a1c2f119493b	ae856958-69bf-432e-bab2-262340b92e0d	2026-01-22 01:58:39.427895+00
59b1e70a-8151-42e4-a6dd-66df8cd09fbb	d41a6dbf-b002-4b46-ac48-f35492f3814d	2f835397-40fb-430f-96bb-3b23e988950e	2026-01-22 02:00:36.574286+00
3373f18f-083e-4372-8bad-6729b39387e7	e6b29f58-e106-46c6-9eab-a1c2f119493b	4ee915ec-4c50-4adf-9650-ea4ee740210f	2026-01-24 03:15:11.312796+00
e58365fe-9aa0-43e3-aa84-4e3bed222fd0	d41a6dbf-b002-4b46-ac48-f35492f3814d	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:16:44.587929+00
9d4e3575-e15e-4449-8696-9473e0561e27	e6b29f58-e106-46c6-9eab-a1c2f119493b	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:34.802889+00
596f0ffe-d3db-434c-b3a6-7e0e660f1cc8	28c62465-f2c9-4653-adae-0918420f06a3	36597eb2-1818-4c3f-b98e-6ba968c77dc4	2026-01-21 09:06:48.890957+00
faaad675-a990-4a12-9e72-602505c03f7e	d41a6dbf-b002-4b46-ac48-f35492f3814d	36597eb2-1818-4c3f-b98e-6ba968c77dc4	2026-01-21 09:06:49.081563+00
10ee9b36-bdad-4dac-af94-ebf3b2049ba6	28c62465-f2c9-4653-adae-0918420f06a3	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:12.331541+00
5ea693ab-a916-4f2f-ad92-f89c64a8c175	d41a6dbf-b002-4b46-ac48-f35492f3814d	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:38:07.78338+00
170befbb-2adb-4d7c-bc2a-b08632e07413	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	a49342a7-3158-433b-a256-172b68d1de57	2026-01-21 09:21:47.032855+00
9894ff18-7964-4a84-a614-8f6da2bedbfb	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:29:04.211425+00
1e9202a5-06ee-4b85-a91b-6d9349fad444	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:22.138781+00
12cc72b9-4bfd-46f2-97f4-ad3a30e35082	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:22.341227+00
5c57378d-82ed-47ef-a556-3fcfe76329fb	d41a6dbf-b002-4b46-ac48-f35492f3814d	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:22.39858+00
ad2d3009-4759-4dc9-8d6c-4091afe76381	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:22.407361+00
8c750e72-042b-46c2-bbc7-3c9ce30609f0	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:44.741873+00
c3d29c5c-a705-420f-94f6-d57c64423d8a	e6b29f58-e106-46c6-9eab-a1c2f119493b	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:38:07.990658+00
005bc395-9544-4950-b217-bd8ba53641a0	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	8c016324-b2b4-42b8-a89f-a46687f7e589	2026-01-21 09:53:01.796423+00
f63fe695-9630-4350-ad10-ae038a8bed39	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	bf7fddef-097c-4ab3-902c-1518c74a15cf	2026-01-21 09:55:51.799961+00
9e80dd47-cdf5-4aaf-866a-e642819ba741	d41a6dbf-b002-4b46-ac48-f35492f3814d	bf7fddef-097c-4ab3-902c-1518c74a15cf	2026-01-21 09:55:52.118989+00
b978066e-efff-4e9a-947e-62d866652458	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:31.15334+00
cfb85f84-d14d-427e-a7d0-d0c990b9a771	e6b29f58-e106-46c6-9eab-a1c2f119493b	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:13.575764+00
934553f1-8543-4224-93d3-de1e4b66dee5	28c62465-f2c9-4653-adae-0918420f06a3	98ebcbeb-44cb-4d6f-89d4-34ec32ef48b8	2026-02-06 14:32:40.19082+00
dfed5e58-eb0c-4dd2-a569-940c895061da	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8bc0ba75-9312-45a3-9848-b6d2ff53501c	2026-01-21 10:29:01.554545+00
ee33b97b-3caa-4644-8a8b-26d326ee64bd	d41a6dbf-b002-4b46-ac48-f35492f3814d	8bc0ba75-9312-45a3-9848-b6d2ff53501c	2026-01-21 10:29:01.574194+00
23330c4f-0db1-4deb-a3de-e25836d35646	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	ab956951-8ac0-4c28-9c8c-0a76af78c939	2026-01-21 10:30:07.955838+00
def68f15-bb35-4be8-b0c9-e17550f68973	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4c9b06d2-6e48-490f-9aca-827a7b94d76b	2026-01-21 10:33:45.213371+00
41d4464a-792c-443a-824b-193eb230c7c9	e6b29f58-e106-46c6-9eab-a1c2f119493b	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:09.408526+00
06e191ed-20d7-4142-9dc1-87ed2fce5c1b	28c62465-f2c9-4653-adae-0918420f06a3	a180426f-c6d9-4ed7-b56b-c299364d2c4f	2026-01-21 10:46:45.935715+00
6ff06090-ef39-4502-9e00-39ad432b2cf5	e6b29f58-e106-46c6-9eab-a1c2f119493b	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:55:34.772278+00
31affe62-ddf0-4bf0-bfb4-d465b7e60179	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	511c3f9d-9125-4586-b351-45348ad11743	2026-01-22 00:35:08.081245+00
d06d678c-df0b-4e18-81ab-c67bcc72ee46	e6b29f58-e106-46c6-9eab-a1c2f119493b	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:43.870473+00
8a4e4dd3-1432-4832-b8e1-7f80f8076bf7	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:42:48.522303+00
8b414a6c-d3fc-47c5-8f54-f8e8a6188793	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:17:51.529125+00
fce55f9f-69b7-4031-809f-3212564014a7	28c62465-f2c9-4653-adae-0918420f06a3	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:04:26.344287+00
85dddb57-056e-4b55-9298-6d6311ba3001	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	2026-01-22 00:44:02.840288+00
6cbdfa3a-4c54-457e-bb45-299b949b698b	d41a6dbf-b002-4b46-ac48-f35492f3814d	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	2026-04-02 11:14:55.127118+00
a02af777-37e2-4327-8c08-f1a578e830e3	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:48:40.463138+00
8b29f502-787e-43c6-b6d0-d1008d516e72	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:48:40.482512+00
251751a2-c04a-43e5-a219-08fe9ba32da9	28c62465-f2c9-4653-adae-0918420f06a3	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:47:44.418523+00
95b868fd-d26d-4661-8dd7-04f5b673b774	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8d390cb3-59e1-45c3-93a0-1459b74498a4	2026-01-22 00:53:10.987596+00
ee327e76-b639-4ed9-9933-ba5d37470174	e6b29f58-e106-46c6-9eab-a1c2f119493b	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:09.454983+00
cb51a58f-b8c3-40fd-b361-49e6b6f32062	d41a6dbf-b002-4b46-ac48-f35492f3814d	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 03:17:38.521147+00
0efa4e35-6673-4e2e-ba28-f17ea79aea99	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	24027bca-5ea0-4b84-bbef-86cfe6eaf976	2026-01-22 01:04:15.469347+00
019a4746-92c8-4442-bb99-7d1d01e4f514	28c62465-f2c9-4653-adae-0918420f06a3	24027bca-5ea0-4b84-bbef-86cfe6eaf976	2026-01-22 01:04:15.748559+00
d144111b-dbe5-4b04-82ac-e24841e09e14	28c62465-f2c9-4653-adae-0918420f06a3	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-05 16:17:32.0506+00
4752fe97-884a-4f75-8467-1f27e5197d63	dad214d1-eab3-4cb9-b3a9-45de14b2e778	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-13 04:25:41.633397+00
fe3cf280-d8a7-48bc-a638-e87628ed6e90	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	2026-01-22 01:13:27.899722+00
c48bbb6c-8d8e-41f6-85dc-654c198f3fc1	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:18:45.244822+00
35cd14cc-5adc-47d5-934a-67981167af97	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:18:45.545591+00
5b0cceed-0d90-4e22-8640-a4c80cc6846e	28c62465-f2c9-4653-adae-0918420f06a3	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	2026-01-22 01:19:52.961944+00
8bf32dee-ba18-4b1a-a90e-adc29766d591	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	761258bd-d832-4b3e-8f14-bb8e3f934d26	2026-01-22 01:21:18.068679+00
173e71d9-cf40-4c91-a349-3910d3aadc66	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	2026-01-22 01:24:25.882421+00
f2e10357-1e65-4574-a328-0e5270b71762	d41a6dbf-b002-4b46-ac48-f35492f3814d	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	2026-01-22 01:26:02.137275+00
e8145e99-a327-4b44-b2fa-a64c7499b1fc	d41a6dbf-b002-4b46-ac48-f35492f3814d	65b54fdc-6983-4242-8b99-823e47f3a0a7	2026-01-22 01:27:27.841505+00
ac59836a-d9c5-41d8-85ae-48858918f727	28c62465-f2c9-4653-adae-0918420f06a3	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:17.556923+00
785d8a9d-b8e7-4641-9d8a-f95f3ced483c	d41a6dbf-b002-4b46-ac48-f35492f3814d	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:24:41.770493+00
9427ce73-f670-4abb-bbdc-cc8cafc1d3eb	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4733c4f2-b333-4f33-8526-490f50a57499	2026-01-22 01:39:45.19678+00
83057162-9c69-4539-ba50-2ae934c4b662	e6b29f58-e106-46c6-9eab-a1c2f119493b	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	2026-01-22 01:43:21.753227+00
ff5ceb7e-941f-44eb-b197-814c835a61cc	d41a6dbf-b002-4b46-ac48-f35492f3814d	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	2026-01-22 01:43:21.830999+00
08e8e9ea-8245-4184-8610-88c1440ca403	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	d28140c0-4739-4adb-b40c-dad97b2551bd	2026-01-22 01:44:51.325793+00
2579c29e-ef12-4b48-97cf-932585b8ae5c	28c62465-f2c9-4653-adae-0918420f06a3	29573c2b-fdf5-4831-974c-9851cb4d9fc3	2026-01-22 01:46:59.305643+00
e7f03ecd-bfe5-447d-87ba-8bd1d8483b0a	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	2026-01-22 01:52:17.265572+00
47fac6d1-9911-407b-8b66-4ad726ccb429	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:57:45.281614+00
94ad2b59-a2c5-4a95-ba4f-8c9ca388bd1e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	2026-01-22 01:55:50.72967+00
6b268882-f020-4fb0-8bd4-289a8e984b0d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:57:45.608689+00
78cb4d9a-c64e-4100-9a04-37c236790327	d41a6dbf-b002-4b46-ac48-f35492f3814d	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-05 12:31:34.042906+00
f7f41f7a-2586-48a7-88db-c8d53d1ca762	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:04:29.285685+00
d1180428-be4f-4839-b1bc-ffdc9af2c83b	e6b29f58-e106-46c6-9eab-a1c2f119493b	b6d92a45-c510-4686-9f25-824bc32e96cb	2026-01-22 02:08:06.790058+00
f31efdb6-2c2f-49d7-80e6-945a2eca85a3	d41a6dbf-b002-4b46-ac48-f35492f3814d	b6d92a45-c510-4686-9f25-824bc32e96cb	2026-01-22 02:08:06.816905+00
c5e072cb-7dc0-4cc0-ba7b-7b1f96c5a33c	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	143a5beb-1342-40f7-b9ef-3431b4c44da4	2026-01-22 02:12:27.643881+00
5ea38186-2096-4d52-b129-b8ae3f7f362d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	9a92b411-973c-485e-9572-541a3989be22	2026-01-22 02:16:22.751516+00
af53c835-c569-4003-89c9-48c1616908ad	e6b29f58-e106-46c6-9eab-a1c2f119493b	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	2026-01-22 02:18:53.637052+00
ba1c441f-d098-48d6-b300-def714574ef1	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:21:45.327161+00
51441973-1f95-4990-92cc-b104270ab3ce	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:14.2998+00
4e041643-c87b-4f2f-b234-8a0339af1425	d41a6dbf-b002-4b46-ac48-f35492f3814d	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	2026-01-22 03:09:08.600775+00
e5b91ce9-17a4-42a4-9808-9eed0f818320	d41a6dbf-b002-4b46-ac48-f35492f3814d	4104824d-4aaa-4ce4-b304-d1074d61fba6	2026-01-22 03:11:54.224913+00
333d0463-d67e-4b41-9aac-1be00715bce3	e6b29f58-e106-46c6-9eab-a1c2f119493b	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	2026-01-22 03:13:13.745168+00
0a934fc3-ec88-442e-9830-68a3eaaf90b4	e6b29f58-e106-46c6-9eab-a1c2f119493b	6d277ecb-1abf-4361-b0c3-0948f3b8d234	2026-01-22 03:16:57.110273+00
6cd011a8-8a33-49b5-af54-955f10ba3dbc	e6b29f58-e106-46c6-9eab-a1c2f119493b	7646b385-d2e4-4b95-acc5-c816e3cd1412	2026-01-22 03:18:28.526131+00
85702b6c-7337-4732-84b4-d9741b214b8d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4ee915ec-4c50-4adf-9650-ea4ee740210f	2026-01-24 03:15:11.313711+00
341b128b-46b7-4cca-81db-6dc3d631972f	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	71db8ee9-f2ce-4548-bf96-dc4dea252445	2026-01-21 07:19:51.503539+00
b23f0e26-9c19-4c70-b59b-fa0c8e77100d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 08:27:38.900409+00
0fd77956-f80a-4399-8fae-396c08f683a9	28c62465-f2c9-4653-adae-0918420f06a3	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:38:07.979813+00
423981a8-a8bc-4e87-90de-6115b11c8061	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	98ebcbeb-44cb-4d6f-89d4-34ec32ef48b8	2026-02-06 14:32:40.196939+00
39c69b2e-08b5-4ff1-bd22-3391c3ab2652	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:55:34.804255+00
2b938e22-038e-45a4-a66c-79622915060a	28c62465-f2c9-4653-adae-0918420f06a3	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:17:51.545182+00
c3253416-6007-447a-8c98-127010ef84d0	e6b29f58-e106-46c6-9eab-a1c2f119493b	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:15:47.873711+00
9338a30b-016a-4bcd-bfd1-01d60f55dafd	d41a6dbf-b002-4b46-ac48-f35492f3814d	76fb9807-6735-478f-a363-79fb2a20be7f	2026-01-17 10:46:19.644804+00
231ff885-c655-4876-9cf9-20885cde1149	28c62465-f2c9-4653-adae-0918420f06a3	a49342a7-3158-433b-a256-172b68d1de57	2026-01-21 09:21:46.959297+00
308ff89c-e9b8-4be1-8d05-e09481e9f1ca	0e7f3286-8516-4931-a1e1-32bfd0ca63fe	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-04-02 11:49:14.56683+00
541ace96-5af1-4586-992c-d267fb60112c	28c62465-f2c9-4653-adae-0918420f06a3	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:22.33412+00
8fbab113-f134-4291-b88a-ec1cbce25b07	28c62465-f2c9-4653-adae-0918420f06a3	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:45.446109+00
a95e752d-02c2-4c87-821e-90362053ba0f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	b7215524-a4d6-4661-a7c3-83643d53bc8d	2026-01-21 09:44:49.094524+00
4d14be08-43a7-490b-b741-8a7613cd0c42	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:09.45575+00
5c2ba9eb-edf2-4c7d-8fd1-dfa303bebf4a	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	bf7fddef-097c-4ab3-902c-1518c74a15cf	2026-01-21 09:55:51.798753+00
efb8a238-1db4-4291-a8d3-6e294c33ddaf	e6b29f58-e106-46c6-9eab-a1c2f119493b	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 03:17:38.575512+00
bb80d08c-d8e6-4781-b020-475baedcf7ce	e6b29f58-e106-46c6-9eab-a1c2f119493b	bf7fddef-097c-4ab3-902c-1518c74a15cf	2026-01-21 09:55:52.111369+00
0dc796a6-800f-4bde-8048-41e6ff8aee55	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	df78758b-da56-491d-a5c4-0c57316a771b	2026-01-21 10:20:31.154609+00
b7422fde-d22d-4f39-8fe9-179706647ae0	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:13.786368+00
889bbe4e-f22d-460d-978c-e3eef1f5a2b2	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-05 16:17:32.069547+00
82b538b9-ecb0-4874-87fb-1b3187e1654b	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:09.690813+00
03b4ad7a-f732-49df-abc8-57b028ba1a62	dad214d1-eab3-4cb9-b3a9-45de14b2e778	5d100834-5494-4217-ac7c-e02053c4f016	2026-06-14 04:20:24.374786+00
c7da186d-dfd1-4bb4-b205-ac3d550bc37b	d41a6dbf-b002-4b46-ac48-f35492f3814d	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:57:45.595538+00
ae849041-783a-4881-9605-52c7fe1a88fa	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	ab956951-8ac0-4c28-9c8c-0a76af78c939	2026-01-21 10:30:08.001172+00
69050fc2-f258-4208-bb10-7e3f651cb2ab	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:45.929668+00
aad4c3e1-86a4-4d9e-836e-df2ee13d89c8	e6b29f58-e106-46c6-9eab-a1c2f119493b	4c9b06d2-6e48-490f-9aca-827a7b94d76b	2026-01-21 10:33:45.21566+00
deb09a6b-ea61-45c0-b41e-1795bc204936	dad214d1-eab3-4cb9-b3a9-45de14b2e778	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-05 12:31:34.042917+00
a0b9ab48-9eac-4530-a7f2-08a63e457ab2	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	9b348117-d9c8-44b7-b321-4c8a3ce50818	2026-01-22 00:34:12.883713+00
361b7f2f-7062-48b7-86c4-34aac6a6db9a	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	9b348117-d9c8-44b7-b321-4c8a3ce50818	2026-01-22 00:34:12.881072+00
c3a13dda-3077-4ff6-94b6-f7de9a062b26	28c62465-f2c9-4653-adae-0918420f06a3	e391e0c4-a811-4ac0-9989-b426e101833d	2026-01-22 00:39:48.42961+00
28604bfa-97e2-42b4-88b0-aadf6ca18405	e6b29f58-e106-46c6-9eab-a1c2f119493b	e391e0c4-a811-4ac0-9989-b426e101833d	2026-01-22 00:39:48.791652+00
a5ebccdc-682d-42fb-b36f-d9b528e85277	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:42:48.528086+00
3bac54da-980b-490a-a500-52a572d8e4c8	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	2026-01-22 00:44:02.851803+00
7bf5cad4-0d16-48f6-917b-375a69d21361	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:45:55.045122+00
ee3d2655-fc34-4589-b6c9-68acfa1f976f	d41a6dbf-b002-4b46-ac48-f35492f3814d	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:48:40.499065+00
51256d2e-5967-47a0-84e7-898a7228b50e	28c62465-f2c9-4653-adae-0918420f06a3	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	2026-01-22 00:50:53.114518+00
b14f7cc2-684e-442c-ba48-bfd856f73561	28c62465-f2c9-4653-adae-0918420f06a3	8d390cb3-59e1-45c3-93a0-1459b74498a4	2026-01-22 00:53:10.977322+00
80c615f9-7455-4129-b731-21903f941962	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	8d390cb3-59e1-45c3-93a0-1459b74498a4	2026-01-22 00:53:11.094813+00
227face0-26ac-451f-b900-f7c7d0cedf4a	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	71415285-c1cb-4855-82ee-37585c51eef9	2026-01-22 01:09:18.910205+00
6e9f2d31-53dd-40e9-8de4-4f8dc5016ae6	28c62465-f2c9-4653-adae-0918420f06a3	71415285-c1cb-4855-82ee-37585c51eef9	2026-01-22 01:09:18.964036+00
22faf039-9448-445a-abc9-b7b8de327909	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	d40eddeb-94f1-4a8e-b05e-f8a02843b691	2026-01-22 01:12:20.099743+00
79c6ef14-250a-43ef-aea2-00eb1a9025b2	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	2026-01-22 01:19:52.940006+00
e19e2d27-8e74-4620-abee-62b9c4e6ce5f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	f8e9a265-897e-43b8-adee-a431e9c3bee9	2026-01-22 01:22:46.920112+00
6faeb38e-5db0-4b1b-a200-58c82ae6d40e	e6b29f58-e106-46c6-9eab-a1c2f119493b	f8e9a265-897e-43b8-adee-a431e9c3bee9	2026-01-22 01:22:47.128279+00
8574eeef-f8b5-4be2-bf4c-ac20e083eff7	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	2026-01-22 01:24:25.886408+00
4ecdbec8-f784-47af-94f9-0bddd5186d08	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	cfd6e3a8-82ce-4a45-b613-0e78fa463439	2026-01-22 01:30:28.083933+00
b30086d0-ff18-4c86-b0ed-70515424e1e1	e6b29f58-e106-46c6-9eab-a1c2f119493b	cfd6e3a8-82ce-4a45-b613-0e78fa463439	2026-01-22 01:30:28.135062+00
b232f082-58ca-4a19-a4cc-c49101bb4dfc	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:17.559369+00
ed0d94de-2a2c-4714-945f-57cd958f81f4	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	2026-01-22 01:43:21.732641+00
c233ff97-2dbc-4ad1-965a-dd21886a6447	d41a6dbf-b002-4b46-ac48-f35492f3814d	d28140c0-4739-4adb-b40c-dad97b2551bd	2026-01-22 01:44:51.326641+00
41b1a910-f6dc-446c-bf7a-d76b5e079bcf	d41a6dbf-b002-4b46-ac48-f35492f3814d	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	2026-01-22 01:50:10.321833+00
dc6dfe4c-2ac0-4589-ba5e-8db6e043996b	e6b29f58-e106-46c6-9eab-a1c2f119493b	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	2026-01-22 01:52:17.269487+00
5d1bf8bf-b25a-44c0-9126-8e3c0e0fe983	d41a6dbf-b002-4b46-ac48-f35492f3814d	b9163fcb-75ec-4a35-8d45-1547315401ac	2026-01-22 01:53:21.728796+00
6fbe1cad-4233-4e4f-8b49-f6a39102743f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	2026-01-22 01:55:50.727765+00
08c14402-5a63-40d8-8552-bf4810bf5341	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	2f835397-40fb-430f-96bb-3b23e988950e	2026-01-22 02:00:36.577801+00
c938cdfa-9de1-4e25-b033-ce4f37d1460c	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:04:29.267465+00
d8d9f660-8ddd-44ad-9f91-542a591b5ee6	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	b6d92a45-c510-4686-9f25-824bc32e96cb	2026-01-22 02:08:06.820534+00
b634b76a-8887-4981-a84a-1efe566c42b5	28c62465-f2c9-4653-adae-0918420f06a3	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	2026-01-22 02:11:16.764443+00
3a82aaa2-fdab-477b-a694-3b9e8bea4beb	e6b29f58-e106-46c6-9eab-a1c2f119493b	143a5beb-1342-40f7-b9ef-3431b4c44da4	2026-01-22 02:12:27.654492+00
00390a78-c85a-4ff1-a33d-37b739885407	d41a6dbf-b002-4b46-ac48-f35492f3814d	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	2026-01-22 02:15:17.927047+00
fa0958c3-62da-45f4-933d-307a7fc160c0	28c62465-f2c9-4653-adae-0918420f06a3	9a92b411-973c-485e-9572-541a3989be22	2026-01-22 02:16:22.756225+00
2a2084a1-8b3f-40f4-b463-75ae707ebaa7	28c62465-f2c9-4653-adae-0918420f06a3	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	2026-01-22 02:17:33.053577+00
eedb7b93-2a91-4b77-a5f5-61786f9fe643	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	2026-01-22 02:18:53.640254+00
8ef54e7c-1fb5-4cb0-96d3-1313df50766f	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	a3f52365-5616-4ae8-8b9d-dfba52c94270	2026-01-22 02:20:10.829061+00
a28cc015-5bee-4c26-b0f7-6fcf189cb21f	28c62465-f2c9-4653-adae-0918420f06a3	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	2026-01-22 02:23:48.231655+00
abff5f42-dc9c-42c5-9d98-486b7626cc02	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	2026-01-22 02:23:48.23147+00
69c7d3de-283b-4363-98ba-1aa2f8eaafb9	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:14.492741+00
19d516ff-7274-4d4f-9258-98aaf12315e7	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	2026-01-22 03:09:08.658425+00
7bffa6e5-c258-43cf-9d87-2383571e6cc1	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4104824d-4aaa-4ce4-b304-d1074d61fba6	2026-01-22 03:11:54.228474+00
56f44bed-612a-4afe-a497-d80fbb0cb4a8	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	2026-01-22 03:13:13.761481+00
7ae2a0c5-2dfc-4da1-9010-06f74ed1f4e2	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	6fb4e6fd-e573-4551-8480-91aaa0d63b80	2026-01-22 03:14:43.048837+00
e2ecfa1a-8777-416f-bdfa-efac83aababd	28c62465-f2c9-4653-adae-0918420f06a3	76fb9807-6735-478f-a363-79fb2a20be7f	2026-01-17 10:46:19.62963+00
3797240e-d6e1-4efc-b522-50efb2c28a60	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-21 06:53:40.963212+00
ae1b3645-6ab2-4943-b139-84ebb972b933	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	71db8ee9-f2ce-4548-bf96-dc4dea252445	2026-01-21 07:19:51.513056+00
c366785f-85d5-475e-a17b-8e85de23baf2	d41a6dbf-b002-4b46-ac48-f35492f3814d	\N	2026-01-21 08:47:03.636363+00
abdc9719-293f-4a6d-89e8-5d9dffb0f4d5	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:34.805928+00
f2b18077-1322-43a4-9c88-0fd8e91adc5d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:11:05.165268+00
541beaf7-e927-43fd-8127-11c56727cc46	d41a6dbf-b002-4b46-ac48-f35492f3814d	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:11:05.254051+00
8064c5c3-1777-40f2-94f5-5c43f91be149	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:12.342409+00
42d5f2f5-e80a-4da4-8883-a6d27d82d0c2	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4ee915ec-4c50-4adf-9650-ea4ee740210f	2026-01-24 03:15:11.355598+00
7d0ef3ed-f15a-4cd4-8381-64f86dd0e610	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:38:07.981805+00
a4b49986-90fd-4d85-ba43-97b9fbcb87b2	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:29:04.222809+00
9959db17-193a-4780-b7de-ce6a17eb298e	d41a6dbf-b002-4b46-ac48-f35492f3814d	98ebcbeb-44cb-4d6f-89d4-34ec32ef48b8	2026-02-06 14:32:40.268728+00
addd697d-e320-4d16-b487-e73cc2de0737	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:17:51.546415+00
c77c7a54-3aff-473f-9e84-2515750b8a61	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	02d46548-0441-412d-b12b-f0830a264840	2026-01-21 09:54:20.645277+00
d367daf5-5aa6-489d-85f1-4599cea585d6	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:04:26.541978+00
db0c3b45-7acb-4766-aad5-e143ed464e9f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:31:22.665266+00
aebb346c-48d8-4e44-a90a-479ef9548cee	c785cfc5-aab2-4027-b788-91ebef1e71b1	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:50:15.824958+00
3421c1dd-c0b1-4c1f-ac47-4ff8a68ab35b	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:09.459177+00
e5e00d4d-9ff7-4baa-8fd8-4c2dd11e7d16	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-05 16:17:32.094045+00
78e7bf25-5f68-4c90-9d58-387ad3dca259	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:09.696655+00
e9b72627-39cb-4560-b991-0de421c7e6ae	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:57:45.591952+00
8d99b920-1596-4db9-a1f5-b280538b1168	e6b29f58-e106-46c6-9eab-a1c2f119493b	ab956951-8ac0-4c28-9c8c-0a76af78c939	2026-01-21 10:30:08.008443+00
f5389cc4-d183-4b1e-b355-4421f66ab17b	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:45.945579+00
64e4260e-59c5-4b2e-bd3a-c12b7b51eb56	d41a6dbf-b002-4b46-ac48-f35492f3814d	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:46.027952+00
dfbf0384-0ced-4e87-85fc-201e8b455f06	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4c9b06d2-6e48-490f-9aca-827a7b94d76b	2026-01-21 10:33:45.227332+00
cc2f822a-91d3-449f-909b-9c2a754482b4	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	766613de-ab18-45a2-9c57-ab6e838c91aa	2026-01-21 10:34:40.814434+00
47712ffb-3308-4b19-994b-c06de042bb4c	28c62465-f2c9-4653-adae-0918420f06a3	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-05 12:31:34.042934+00
5764dc04-177a-4700-bf0a-1c6f8b72a997	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	a180426f-c6d9-4ed7-b56b-c299364d2c4f	2026-01-21 10:46:45.939295+00
a55013ce-8a74-4f64-9979-66652d804ed0	28c62465-f2c9-4653-adae-0918420f06a3	9b348117-d9c8-44b7-b321-4c8a3ce50818	2026-01-22 00:34:12.894765+00
f4e2b0d8-139b-483b-b729-7ac4a4052186	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e391e0c4-a811-4ac0-9989-b426e101833d	2026-01-22 00:39:48.780613+00
9a71cb0d-5cc6-4763-853e-406be89dae0b	d41a6dbf-b002-4b46-ac48-f35492f3814d	e391e0c4-a811-4ac0-9989-b426e101833d	2026-01-22 00:39:48.79934+00
225d3963-46bd-4e6c-b997-aec1201b3cc3	e6b29f58-e106-46c6-9eab-a1c2f119493b	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	2026-01-22 00:44:02.849219+00
8afe4d81-d018-4555-8e6f-1e328d1315be	d41a6dbf-b002-4b46-ac48-f35492f3814d	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:45:55.051066+00
60e6b014-ea41-4743-8057-8f8f958451e0	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	2026-01-22 00:50:53.127269+00
2872f854-dc31-4d77-8cf6-b6165b15a6c3	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c801a58c-8dde-4ff0-9193-cd33de0e1e03	2026-01-22 01:00:48.221646+00
cd8b9df2-ac0e-4db0-827f-544f3bc13b3f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	71415285-c1cb-4855-82ee-37585c51eef9	2026-01-22 01:09:18.919339+00
c118a633-17e1-46ed-9a00-ba4b807abe0e	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	f8e9a265-897e-43b8-adee-a431e9c3bee9	2026-01-22 01:22:46.920397+00
433a1be3-78f1-4803-9a59-0f09cacb91c7	e6b29f58-e106-46c6-9eab-a1c2f119493b	5981f73f-c8eb-46ca-97cf-61bb2373bc52	2026-01-22 01:38:42.487832+00
2b6690e5-a059-49a8-8c89-86a6ca97a084	e6b29f58-e106-46c6-9eab-a1c2f119493b	4733c4f2-b333-4f33-8526-490f50a57499	2026-01-22 01:39:45.197476+00
25a079df-ab9b-41ae-96d9-ba24ea40dfcd	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	2026-01-22 01:43:21.751353+00
e9bcd512-d9f7-429c-b985-07343e246f94	e6b29f58-e106-46c6-9eab-a1c2f119493b	d28140c0-4739-4adb-b40c-dad97b2551bd	2026-01-22 01:44:51.327978+00
683ca675-1909-4fad-8cc2-4d056001978f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	1e2967ab-e057-4927-8fe4-b2f769a5a6df	2026-01-22 01:48:39.244781+00
ddc217f8-b9c6-474b-903a-8692ac5e61ec	e6b29f58-e106-46c6-9eab-a1c2f119493b	1e2967ab-e057-4927-8fe4-b2f769a5a6df	2026-01-22 01:48:39.573161+00
b34beac9-75e0-434d-b65f-232c4ae30434	28c62465-f2c9-4653-adae-0918420f06a3	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	2026-01-22 01:50:10.324614+00
abadb7cd-d6f4-4293-b433-9648ce67f47c	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	b6d92a45-c510-4686-9f25-824bc32e96cb	2026-01-22 02:08:06.805248+00
a8882a0a-477c-4e97-b43e-37d4b6909ece	28c62465-f2c9-4653-adae-0918420f06a3	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	2026-01-22 02:09:19.588222+00
481f953b-f238-4bcf-98ba-2e7fc89ed159	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	2026-01-22 02:09:19.603529+00
c7476e45-36ae-48b5-9522-fb3ccfbc63ac	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	3f43944a-64de-489a-aac4-7564b6367304	2026-01-22 02:14:08.876228+00
ee9829dd-f8a6-41a6-8f20-407ac7d19f16	28c62465-f2c9-4653-adae-0918420f06a3	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	2026-01-22 02:15:17.932239+00
9103189b-8a70-4b13-80d6-58df6d8a7422	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	9a92b411-973c-485e-9572-541a3989be22	2026-01-22 02:16:22.750899+00
cbf9a23c-ffe8-499c-83e5-1252bb2c4844	d41a6dbf-b002-4b46-ac48-f35492f3814d	a3f52365-5616-4ae8-8b9d-dfba52c94270	2026-01-22 02:20:10.821982+00
6407e848-5f1c-4c9d-87ae-9d75222e6cc0	e6b29f58-e106-46c6-9eab-a1c2f119493b	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	2026-01-22 02:23:48.234452+00
9e4eb317-ec5d-4282-bb11-a0de66440b52	28c62465-f2c9-4653-adae-0918420f06a3	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:14.498615+00
eebec37a-96bd-4ef3-835e-c31de6b748c3	e6b29f58-e106-46c6-9eab-a1c2f119493b	44d5783f-4535-4541-bb10-efcf81eec4a3	2026-01-22 03:10:30.90453+00
5c5452e9-c050-4ce2-a8ed-96b858d1892c	d41a6dbf-b002-4b46-ac48-f35492f3814d	44d5783f-4535-4541-bb10-efcf81eec4a3	2026-01-22 03:10:30.924429+00
7fee1950-158b-4d12-8def-e6786a96453b	28c62465-f2c9-4653-adae-0918420f06a3	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	2026-01-22 03:13:13.82869+00
b3c95d53-e09f-4cba-a170-4dda78e2ef5c	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6fb4e6fd-e573-4551-8480-91aaa0d63b80	2026-01-22 03:14:43.054383+00
b188b566-91f9-4ab7-ac0c-e308333cb697	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	7646b385-d2e4-4b95-acc5-c816e3cd1412	2026-01-22 03:18:28.523032+00
ffb0beae-6148-4104-beb9-2e28490e6500	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	2026-01-22 03:19:52.994434+00
aadef62f-3494-4290-999c-a283bee16114	d41a6dbf-b002-4b46-ac48-f35492f3814d	35dca33b-9d87-448c-80f5-a93eb0940c7f	2026-01-22 03:22:24.874941+00
42d39132-7dc5-43af-a500-c81c5146b203	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	9ec8512b-24ba-4581-a362-6f7a3a6c0235	2026-01-22 03:24:07.847453+00
80e527fb-3ac4-4360-a89f-4d12dc53b388	e6b29f58-e106-46c6-9eab-a1c2f119493b	9ec8512b-24ba-4581-a362-6f7a3a6c0235	2026-01-22 03:24:07.851851+00
d1c0c1ad-45b1-4b33-886d-cc55438f9b3a	28c62465-f2c9-4653-adae-0918420f06a3	9ec8512b-24ba-4581-a362-6f7a3a6c0235	2026-01-22 03:24:07.880249+00
6ba41212-c004-43b4-b49f-15ea5d52b21d	e6b29f58-e106-46c6-9eab-a1c2f119493b	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 07:04:14.326277+00
66558c0e-c5a0-4101-a89f-2a8f65e54a4c	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-24 06:08:20.920722+00
b9ba0db3-013b-4852-91a1-6f3f845e9bef	e6b29f58-e106-46c6-9eab-a1c2f119493b	71db8ee9-f2ce-4548-bf96-dc4dea252445	2026-01-21 07:19:51.517806+00
d3dbfe94-dacb-4073-b213-7f7471bcdd18	28c62465-f2c9-4653-adae-0918420f06a3	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:02:29.620515+00
7422f1d4-b20b-44a5-a348-ef3aed8f2c06	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:38:07.984674+00
425eec55-2582-40f8-bce5-0919949f1067	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:34.805525+00
c8352e34-586c-4fb2-a9a4-6752fe9c27f5	28c62465-f2c9-4653-adae-0918420f06a3	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 05:05:51.267838+00
02a134d4-da1b-4f5a-8b4f-06f65f505d57	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 05:05:51.247135+00
c9b6df70-2779-4430-9314-d494a1b7772c	e6b29f58-e106-46c6-9eab-a1c2f119493b	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:11:05.342942+00
3556e88b-0565-4ed9-93dc-19edc2132c2d	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:12.334814+00
69ee7d93-cd20-4c12-ba22-9bab3cb861fc	d41a6dbf-b002-4b46-ac48-f35492f3814d	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:15:48.078086+00
40fb6500-3e51-4a68-b347-09b4cc47b583	d41a6dbf-b002-4b46-ac48-f35492f3814d	a49342a7-3158-433b-a256-172b68d1de57	2026-01-21 09:21:46.966679+00
3c476fb4-145e-483b-b68f-e2bafc58bcf4	d41a6dbf-b002-4b46-ac48-f35492f3814d	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:29:04.221891+00
985b8ca2-bf62-4b30-bd0b-5133faf3986b	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:55:34.806553+00
0961aa0b-18b3-4932-b4cb-e17d6e3a47e7	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	535c19e9-df3b-46c1-95dc-f93cb3f22afe	2026-01-21 09:40:52.981297+00
a9dc84dc-54d2-4869-8155-f226b39a5190	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:19:31.414822+00
d6df3560-f425-48fc-9fc5-9d9e756e4ce4	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8c6c740c-b564-48ae-9b85-a164e99155fd	2026-01-21 10:22:42.459757+00
9657cdd2-3559-4aec-94d2-f48785cdd5d8	d41a6dbf-b002-4b46-ac48-f35492f3814d	11c5a34a-a000-45e4-a301-09a98be93ba0	2026-01-17 11:25:09.518896+00
c1afd7cf-ff85-4cc5-a96e-de2445b7137a	e6b29f58-e106-46c6-9eab-a1c2f119493b	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:31:22.671959+00
a23a7f3a-e008-460c-bcd8-a47e33657bec	dad214d1-eab3-4cb9-b3a9-45de14b2e778	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:50:15.828435+00
5f83f2f3-13ea-43d2-915d-f45eae229c9d	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	2026-01-21 10:27:18.598553+00
8fd7a222-27c6-4013-aafc-44622f3aa837	28c62465-f2c9-4653-adae-0918420f06a3	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:09.470949+00
f4a7f3a6-0e25-4771-b7fe-b8ff0cb80b31	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:38:24.427772+00
8b3e5698-0461-40f8-8f14-4e12c39fc100	e6b29f58-e106-46c6-9eab-a1c2f119493b	8bc0ba75-9312-45a3-9848-b6d2ff53501c	2026-01-21 10:29:01.56515+00
f400ede5-76ad-43d2-91ed-0f40f3ec2b07	28c62465-f2c9-4653-adae-0918420f06a3	11c5a34a-a000-45e4-a301-09a98be93ba0	2026-01-17 11:25:09.548685+00
7f466cb2-c4db-4912-bd36-92a3fef0cdaf	d41a6dbf-b002-4b46-ac48-f35492f3814d	ab956951-8ac0-4c28-9c8c-0a76af78c939	2026-01-21 10:30:08.008426+00
75ebc94c-73ff-4a60-8d18-d332d081a5f4	28c62465-f2c9-4653-adae-0918420f06a3	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:45.955683+00
bd894e04-8b5f-4bea-b7cc-09116c3f2d84	d41a6dbf-b002-4b46-ac48-f35492f3814d	4c9b06d2-6e48-490f-9aca-827a7b94d76b	2026-01-21 10:33:45.247885+00
f6294370-4a0a-4845-9f23-a681d02d1a7b	e6b29f58-e106-46c6-9eab-a1c2f119493b	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:57:45.606613+00
9b895a8c-1c4a-4ffc-ab70-77e43e1ae850	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	766613de-ab18-45a2-9c57-ab6e838c91aa	2026-01-21 10:34:40.821482+00
0ec2bbaf-d2f7-4bd4-80f0-1fc01920f8f6	d41a6dbf-b002-4b46-ac48-f35492f3814d	a180426f-c6d9-4ed7-b56b-c299364d2c4f	2026-01-21 10:46:45.945532+00
d6029c34-8399-411b-aa90-7cfe3108e32c	d41a6dbf-b002-4b46-ac48-f35492f3814d	9b348117-d9c8-44b7-b321-4c8a3ce50818	2026-01-22 00:34:12.897837+00
76b49e5d-5bb2-4501-9d6c-7da19204a129	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-05 12:31:34.042876+00
1b6c4de8-fcd3-44de-ab48-36127ba3b30b	e6b29f58-e106-46c6-9eab-a1c2f119493b	511c3f9d-9125-4586-b351-45348ad11743	2026-01-22 00:35:08.086605+00
78e4fea7-4514-47a5-953b-0690f91512af	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e391e0c4-a811-4ac0-9989-b426e101833d	2026-01-22 00:39:48.788209+00
a79c5a2f-757a-44f1-bf39-650132f02fe8	28c62465-f2c9-4653-adae-0918420f06a3	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:42:48.528147+00
a32fc378-2732-49be-afff-ccdec8c03d10	28c62465-f2c9-4653-adae-0918420f06a3	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	2026-01-22 00:44:02.781588+00
c859fd7e-9c1f-4808-ab1a-e41ae5d4765c	e6b29f58-e106-46c6-9eab-a1c2f119493b	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:48:40.480155+00
d1c9cce6-793e-493f-91a2-4491caa61757	d41a6dbf-b002-4b46-ac48-f35492f3814d	fc6c6611-60cb-44d8-8de7-613f7d7869b5	2026-01-22 00:52:03.002208+00
ea5607e8-c546-42e7-9d22-43eb4071c1c8	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c801a58c-8dde-4ff0-9193-cd33de0e1e03	2026-01-22 01:00:48.229783+00
bb327432-851a-44a2-9616-a03e065ea324	d41a6dbf-b002-4b46-ac48-f35492f3814d	344b49b7-2784-4453-8732-b03ad4a571bf	2026-01-17 16:31:55.031081+00
98897228-aef8-42e4-bf5c-5cb63fd736f8	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	71415285-c1cb-4855-82ee-37585c51eef9	2026-01-22 01:09:18.919645+00
431c04d0-8914-4686-a240-0c613197ab0f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	d40eddeb-94f1-4a8e-b05e-f8a02843b691	2026-01-22 01:12:20.141057+00
18f1df0c-8767-4487-8772-5edd0dcefb66	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	1919a069-3c62-4408-9f6b-aba65bbdcce7	2026-01-22 01:16:43.20378+00
c093115d-e356-4769-aa8d-34a0115a41b8	e6b29f58-e106-46c6-9eab-a1c2f119493b	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	2026-01-22 01:19:52.953712+00
ac97c922-9a75-4308-b42b-efbbcfa665de	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	f8e9a265-897e-43b8-adee-a431e9c3bee9	2026-01-22 01:22:46.939553+00
0059abe2-cc34-450b-88c9-1573aa3df4a6	28c62465-f2c9-4653-adae-0918420f06a3	344b49b7-2784-4453-8732-b03ad4a571bf	2026-01-17 16:31:55.031446+00
bc23ae92-b2c7-4c73-97c1-c962c6c9ff55	28c62465-f2c9-4653-adae-0918420f06a3	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	2026-01-22 01:24:25.922982+00
7278dd55-37f7-4c84-91e3-0d4345da6e27	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	2026-01-22 01:26:02.150114+00
6cb82765-2aac-4bc0-8851-07ca557f76d2	d41a6dbf-b002-4b46-ac48-f35492f3814d	cfd6e3a8-82ce-4a45-b613-0e78fa463439	2026-01-22 01:30:28.139179+00
2be9299b-8c17-49d6-bb22-b640a0459be0	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4733c4f2-b333-4f33-8526-490f50a57499	2026-01-22 01:39:45.200863+00
56a5e7fe-e2d5-4c5b-b960-f72b8a4c4cf8	28c62465-f2c9-4653-adae-0918420f06a3	d28140c0-4739-4adb-b40c-dad97b2551bd	2026-01-22 01:44:51.329743+00
78980c76-38f2-43eb-beef-f6fa4095b3aa	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	1e2967ab-e057-4927-8fe4-b2f769a5a6df	2026-01-22 01:48:39.550339+00
b71365c7-b745-4771-851e-dd2f7f58749a	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	2026-01-22 01:50:10.319686+00
a8d711ca-9f54-4d36-854c-78d694c00552	e6b29f58-e106-46c6-9eab-a1c2f119493b	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-22 01:54:36.987267+00
f03deb9b-f2ae-4f86-b003-f1ed505fa1b4	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	ae856958-69bf-432e-bab2-262340b92e0d	2026-01-22 01:58:39.44897+00
e24ff89e-3103-4a0a-97ac-693efc334d1f	e6b29f58-e106-46c6-9eab-a1c2f119493b	5c53db2c-057e-4bf6-9782-31a25c74e269	2026-01-22 02:02:52.751875+00
42838374-9cd0-449b-b667-0591e836a60f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	b6d92a45-c510-4686-9f25-824bc32e96cb	2026-01-22 02:08:06.804242+00
67d0e02a-1959-4071-b26d-40087d4519af	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	2026-01-22 02:11:16.78852+00
f6b47ac3-da2c-4eba-a605-bda5878876db	d41a6dbf-b002-4b46-ac48-f35492f3814d	143a5beb-1342-40f7-b9ef-3431b4c44da4	2026-01-22 02:12:27.662162+00
e6bb84b3-ce5a-414a-86fd-8349b7e24d5f	28c62465-f2c9-4653-adae-0918420f06a3	3f43944a-64de-489a-aac4-7564b6367304	2026-01-22 02:14:08.878975+00
e898ff85-50b6-4d7f-aa28-3ed1231be3d3	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	2026-01-22 02:18:53.61831+00
7651a59e-70ca-4f86-83d0-8b5f4128cc7a	e6b29f58-e106-46c6-9eab-a1c2f119493b	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:21:45.306745+00
aa806b81-5a43-4b81-8ae7-f64710dac1fb	28c62465-f2c9-4653-adae-0918420f06a3	9251db17-0835-41c7-8469-28dee88096b1	2026-01-18 11:39:01.555154+00
9c5db14e-6f97-432f-9ab5-c168220eee32	d41a6dbf-b002-4b46-ac48-f35492f3814d	9251db17-0835-41c7-8469-28dee88096b1	2026-01-18 11:39:01.559172+00
6ba04592-9579-4750-aaa6-d74908405ead	e6b29f58-e106-46c6-9eab-a1c2f119493b	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-21 07:07:17.396934+00
1cc7e837-39bc-407b-9da7-885b1923040c	e6b29f58-e106-46c6-9eab-a1c2f119493b	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-24 06:08:20.921117+00
78c77520-a38f-4686-a246-adca075120a7	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:27:55.741902+00
e36f3a75-9dcb-4827-b80d-630e9b0e91ac	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:38:07.985878+00
fe38436f-be06-499b-a489-2f06bcb7a3fc	28c62465-f2c9-4653-adae-0918420f06a3	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:34.831072+00
7a0865d0-7159-4f67-a2df-ac1dd734c070	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:11:05.21695+00
06d024da-60b8-4c2b-ae5c-17e4425bd2b3	e6b29f58-e106-46c6-9eab-a1c2f119493b	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 05:05:51.290132+00
1a53384d-4ed5-451b-b8e5-1f3d88afdbc9	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	a49342a7-3158-433b-a256-172b68d1de57	2026-01-21 09:21:46.967702+00
49ab99a9-ae7f-4144-abe4-e08926eaa3bf	e6b29f58-e106-46c6-9eab-a1c2f119493b	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:10.561523+00
590c6931-0a83-40e0-b7c4-ac1b06981109	d41a6dbf-b002-4b46-ac48-f35492f3814d	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:10.693648+00
03de05aa-0ef4-4281-b74e-b13c1075a66c	28c62465-f2c9-4653-adae-0918420f06a3	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:55:34.807519+00
0372bdf2-221a-4a78-8ca1-18af25119063	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c69d726e-a55a-4e43-ac7b-270a4ab83e85	2026-03-25 12:39:17.24961+00
fa04a765-8490-45e2-bb26-631b72065d4b	28c62465-f2c9-4653-adae-0918420f06a3	535c19e9-df3b-46c1-95dc-f93cb3f22afe	2026-01-21 09:40:53.030952+00
7dbdba9f-95d5-46d7-ba91-639feec562dc	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	b7215524-a4d6-4661-a7c3-83643d53bc8d	2026-01-21 09:44:49.124471+00
9c8da711-1372-414b-adfd-5fddf7e5af04	28c62465-f2c9-4653-adae-0918420f06a3	02d46548-0441-412d-b12b-f0830a264840	2026-01-21 09:54:20.844077+00
3061feaf-0d30-4b54-8b4e-8a1557480e76	d41a6dbf-b002-4b46-ac48-f35492f3814d	02d46548-0441-412d-b12b-f0830a264840	2026-01-21 09:54:21.008157+00
2201bc22-5cce-4cbe-a780-b217a2519853	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	8c6c740c-b564-48ae-9b85-a164e99155fd	2026-01-21 10:22:42.501409+00
b3f60088-a233-44ef-ab23-b5a4217cfae5	28c62465-f2c9-4653-adae-0918420f06a3	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:13.848572+00
41dd4e1d-35fa-4708-8888-720089ece62f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	2026-01-21 10:27:18.599496+00
8fed8867-c210-41ce-9878-5a7b5bec67e4	e6b29f58-e106-46c6-9eab-a1c2f119493b	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:06:36.18722+00
64c0e44e-e1f9-4046-b2fc-e1519ceadcc7	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	8bc0ba75-9312-45a3-9848-b6d2ff53501c	2026-01-21 10:29:01.553893+00
37280683-131f-4d84-b6a0-7a219330f5f3	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	8bc0ba75-9312-45a3-9848-b6d2ff53501c	2026-01-21 10:29:01.576817+00
c0d87f63-8b74-4433-b716-7536d21ae0cc	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:06:36.211849+00
9994dbd3-0b37-41c4-9c55-64008d3475da	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:31:22.668751+00
5dd288b6-d10f-4348-bd8f-0dddf779ed29	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	68c69129-f1de-4538-997d-7e7f1cd24af6	2026-04-03 17:08:31.980883+00
960dedd4-8fd9-403b-bbfb-8d42df94f524	e6b29f58-e106-46c6-9eab-a1c2f119493b	68c69129-f1de-4538-997d-7e7f1cd24af6	2026-04-03 17:08:31.97859+00
d7e98f2c-9748-4299-ae05-3fcf06d7a0b4	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	9b348117-d9c8-44b7-b321-4c8a3ce50818	2026-01-22 00:34:12.896676+00
40b45422-04f9-4c0e-b3be-b5c5857e7344	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:43.529321+00
cfe99084-a903-441a-ab64-5a9ce901fb49	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e391e0c4-a811-4ac0-9989-b426e101833d	2026-01-22 00:39:48.792364+00
31670663-6e88-4409-824a-3984719b0fb3	e6b29f58-e106-46c6-9eab-a1c2f119493b	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:42:48.545177+00
50d808a3-c908-4692-9231-876a2f2dc725	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	2026-01-22 00:44:02.780998+00
45a36173-7263-44ab-9846-9c68e07120ec	e6b29f58-e106-46c6-9eab-a1c2f119493b	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:25.600888+00
d7e81a98-d34a-4e64-b577-22db8813392f	28c62465-f2c9-4653-adae-0918420f06a3	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:48:40.490563+00
02c62546-9326-4a28-ae2a-17b5a7bf2c51	e6b29f58-e106-46c6-9eab-a1c2f119493b	fc6c6611-60cb-44d8-8de7-613f7d7869b5	2026-01-22 00:52:02.997398+00
c01cef32-083e-48db-a010-89af5d76ae72	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	8d390cb3-59e1-45c3-93a0-1459b74498a4	2026-01-22 00:53:10.987708+00
9a949060-eac9-418e-a58b-8280dc518c82	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	2026-01-22 01:04:06.992323+00
80a1146e-c495-4d17-8919-6f2e7122eba6	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	68c69129-f1de-4538-997d-7e7f1cd24af6	2026-04-03 17:08:31.98636+00
0f53930f-ad60-4f70-8ee2-a60a288c992b	28c62465-f2c9-4653-adae-0918420f06a3	68c69129-f1de-4538-997d-7e7f1cd24af6	2026-04-03 17:08:32.254147+00
ba6ed90a-e387-4353-a4ef-82c7f94fa87f	d41a6dbf-b002-4b46-ac48-f35492f3814d	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:38:24.438344+00
f6637c49-4f5a-4d34-98a1-4c9bc6195ad8	d41a6dbf-b002-4b46-ac48-f35492f3814d	d40eddeb-94f1-4a8e-b05e-f8a02843b691	2026-01-22 01:12:20.169192+00
9589ec44-d9bd-489c-a2b7-f25daf853448	d41a6dbf-b002-4b46-ac48-f35492f3814d	1919a069-3c62-4408-9f6b-aba65bbdcce7	2026-01-22 01:16:43.207001+00
de53b37c-f851-4ed8-a0f8-f94dea8b28e3	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:18:45.595675+00
806e0bd2-c4e5-4dfe-b454-4d00b1f58abe	28c62465-f2c9-4653-adae-0918420f06a3	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:57:45.630416+00
953e0ccd-5540-438c-8a28-12c404f7a82e	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 11:24:03.811977+00
8200022f-19bd-432c-80d5-5d044dd0eb55	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 11:24:03.79381+00
9722fb79-e61f-4b02-8a93-facd66fd1485	d41a6dbf-b002-4b46-ac48-f35492f3814d	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 11:24:04.251196+00
3d369565-5a20-4086-9086-c0a499fd731e	d41a6dbf-b002-4b46-ac48-f35492f3814d	af98d38f-7f5e-42d6-8349-e30c5a006801	2026-01-22 01:37:17.580121+00
c8495e7b-08b7-43c0-824e-0ab18c3eb55c	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	5981f73f-c8eb-46ca-97cf-61bb2373bc52	2026-01-22 01:38:42.483047+00
4017f123-539e-4ab2-a03c-7b64fdebca3f	e6b29f58-e106-46c6-9eab-a1c2f119493b	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	2026-01-22 01:41:33.230468+00
69256b23-e120-4fb0-87c8-f6b949287435	28c62465-f2c9-4653-adae-0918420f06a3	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	2026-01-22 01:41:33.280477+00
1002c204-a999-4acf-afb2-3542ae83760c	28c62465-f2c9-4653-adae-0918420f06a3	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 11:24:04.248515+00
1974e270-5caf-4be5-bbd1-2fdba94afc1b	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	2026-01-22 01:50:10.337009+00
602f46d7-ecb7-45ea-8fe3-6959f88d5c5a	d41a6dbf-b002-4b46-ac48-f35492f3814d	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	2026-01-22 01:52:17.281302+00
850f9360-2117-418c-99f2-88490108753f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-22 01:54:36.996757+00
cd1c9202-ce2a-427e-84e2-edba0f9c4789	28c62465-f2c9-4653-adae-0918420f06a3	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-22 01:54:37.338908+00
11252cf0-6e49-4a24-8714-30aeeb078730	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	2026-01-22 01:55:50.737256+00
a8140f8c-7c24-43c3-8f99-2060f90f61eb	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	2f835397-40fb-430f-96bb-3b23e988950e	2026-01-22 02:00:36.200857+00
8c51e57c-18cf-41f1-aefd-29b00538000a	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	5c53db2c-057e-4bf6-9782-31a25c74e269	2026-01-22 02:02:52.761432+00
e3c973ba-06f1-4444-8adf-54eaef2f588f	d41a6dbf-b002-4b46-ac48-f35492f3814d	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:04:29.606029+00
8b85eef5-58cb-453a-bd34-288cf2156e8c	28c62465-f2c9-4653-adae-0918420f06a3	b6d92a45-c510-4686-9f25-824bc32e96cb	2026-01-22 02:08:06.809353+00
613c330c-19c8-483a-9f87-be42bcc27d63	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	2026-01-22 02:09:19.603289+00
fede8763-462a-4d53-bbd0-3a1414ecd7ab	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	2026-01-22 02:11:16.785423+00
fd293f9a-9168-4ff6-b14e-2735526f139b	28c62465-f2c9-4653-adae-0918420f06a3	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	2026-01-22 02:18:53.628974+00
dc82d2a5-21f8-40c5-83ac-a34652851b18	28c62465-f2c9-4653-adae-0918420f06a3	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:21:45.307972+00
5131fcfb-e4de-4f3f-83c1-41f6222430bc	d41a6dbf-b002-4b46-ac48-f35492f3814d	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:14.503961+00
fe66a822-6420-4927-ab22-60faef1f1907	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	44d5783f-4535-4541-bb10-efcf81eec4a3	2026-01-22 03:10:30.705758+00
7e435b95-1756-4053-98e0-7d051b53bfc6	28c62465-f2c9-4653-adae-0918420f06a3	44d5783f-4535-4541-bb10-efcf81eec4a3	2026-01-22 03:10:30.908852+00
5213a7aa-5612-48fb-9f18-8957ef41c462	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	6d277ecb-1abf-4361-b0c3-0948f3b8d234	2026-01-22 03:16:57.139568+00
7f78c88e-a3be-4caa-836f-46e7e52c4da2	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	7646b385-d2e4-4b95-acc5-c816e3cd1412	2026-01-22 03:18:28.537418+00
511fa5a1-76fa-4c44-bee1-b906ce2d265f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	35dca33b-9d87-448c-80f5-a93eb0940c7f	2026-01-22 03:22:24.853227+00
76047f0f-b733-45c5-b862-f2e8a7421798	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	35dca33b-9d87-448c-80f5-a93eb0940c7f	2026-01-22 03:22:25.053748+00
eabfc073-14a2-47f2-8319-03e2484c1de9	28c62465-f2c9-4653-adae-0918420f06a3	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-24 06:08:20.927088+00
c725c61e-f31d-49a5-93cb-5420d7365a25	d41a6dbf-b002-4b46-ac48-f35492f3814d	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-19 16:09:08.922073+00
6a05cc93-1e49-432f-b890-0177fa7e3c77	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-21 07:15:23.02692+00
8e89aa7b-8d09-4190-8aff-a786f03b3a7d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 07:31:20.343763+00
01dbf1ea-f948-4b5f-9da3-ba2361742c5e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:02:29.630542+00
50c01db6-0587-4a09-9923-47ddee0ca8d9	d41a6dbf-b002-4b46-ac48-f35492f3814d	9f377073-462e-4308-a72c-f1a6ccbea515	2026-01-21 09:05:34.992457+00
15717d69-9290-4c3d-8a87-24b57ced012d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c43b8800-64e8-4207-a797-6e432afc37d2	2026-01-21 09:11:05.214189+00
9d7a3b59-86c9-4e53-99c9-aed57f7352e2	d41a6dbf-b002-4b46-ac48-f35492f3814d	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:14:12.37054+00
1d9a7a75-431b-4692-9390-32b91e201d16	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:15:47.887721+00
eccbfdac-df17-4d8f-8a07-6924b78b6ec6	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:03.828758+00
43421edf-ac48-4257-8483-68baf54706b6	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:03.850866+00
d4436bd8-db94-4103-b9c5-dcac870799d7	e6b29f58-e106-46c6-9eab-a1c2f119493b	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:03.896111+00
ad5e600e-7bdb-4309-86e4-597a8bee736d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:10.361395+00
bca51a64-d020-455f-9bd8-0e35d064b3ec	e6b29f58-e106-46c6-9eab-a1c2f119493b	1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	2026-01-21 09:35:22.456149+00
55b61530-fb77-471c-b343-3cd0e33200b1	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	535c19e9-df3b-46c1-95dc-f93cb3f22afe	2026-01-21 09:40:52.987849+00
2ae7b176-2a7b-44f0-81e2-864759ad8e84	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	b7215524-a4d6-4661-a7c3-83643d53bc8d	2026-01-21 09:44:49.132093+00
71b06935-5b88-4155-a1aa-115e226b203f	e6b29f58-e106-46c6-9eab-a1c2f119493b	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:19:31.455055+00
ccb7107f-fa20-4669-94df-5816d1c73ea9	e6b29f58-e106-46c6-9eab-a1c2f119493b	8c6c740c-b564-48ae-9b85-a164e99155fd	2026-01-21 10:22:42.542765+00
5d297c68-a451-48fc-9c6d-cc729eb538d3	e6b29f58-e106-46c6-9eab-a1c2f119493b	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	2026-01-21 10:27:18.604738+00
d490a1df-eeef-4ae2-a7e4-3e48163fbcca	28c62465-f2c9-4653-adae-0918420f06a3	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	2026-01-21 10:27:18.822843+00
ecc66475-c9d4-4097-9b1f-27790ef6750a	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:09.71271+00
b4821f96-eb4e-405c-a683-f5c8d9e53889	28c62465-f2c9-4653-adae-0918420f06a3	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:39.3072+00
cd516be3-edf9-481e-9329-c4febada9d16	e6b29f58-e106-46c6-9eab-a1c2f119493b	766613de-ab18-45a2-9c57-ab6e838c91aa	2026-01-21 10:34:40.832001+00
e54eb566-1224-4c8c-8c64-edffbb517d5a	28c62465-f2c9-4653-adae-0918420f06a3	d4e15dfe-84c9-489a-997f-4303eb9de453	2026-01-21 12:17:53.793345+00
b6da4cfd-9edd-4394-b656-d3d170d38c2e	e6b29f58-e106-46c6-9eab-a1c2f119493b	c69d726e-a55a-4e43-ac7b-270a4ab83e85	2026-03-25 12:39:17.290513+00
8c8bc029-d919-40d4-8f4f-b9a72d9b2ba6	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	d4e15dfe-84c9-489a-997f-4303eb9de453	2026-01-21 12:17:53.873956+00
c415c161-47b9-402c-b813-8b1ecf408fd6	d41a6dbf-b002-4b46-ac48-f35492f3814d	d4e15dfe-84c9-489a-997f-4303eb9de453	2026-01-21 12:17:53.88204+00
86b951aa-553e-4429-b291-289f97eb5b84	e6b29f58-e106-46c6-9eab-a1c2f119493b	9b348117-d9c8-44b7-b321-4c8a3ce50818	2026-01-22 00:34:12.908507+00
964d2ddb-bccf-4ab5-b8a7-cf2f2417d022	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:06:36.199456+00
bd96d394-8b28-4694-b8db-95812a802d37	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	50644fc3-8363-44f2-836e-61b3a252478d	2026-01-22 00:41:41.057045+00
feb24039-33bf-47e8-ad95-70be918cdd7b	e6b29f58-e106-46c6-9eab-a1c2f119493b	50644fc3-8363-44f2-836e-61b3a252478d	2026-01-22 00:41:41.076951+00
941320b5-74d9-4d0e-b184-c42d4eea4012	28c62465-f2c9-4653-adae-0918420f06a3	50644fc3-8363-44f2-836e-61b3a252478d	2026-01-22 00:41:41.170299+00
1762d1d4-7387-4433-aace-1c9058f8c9e0	28c62465-f2c9-4653-adae-0918420f06a3	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:31:22.675262+00
37d95673-6c40-4e31-b15f-f76f95862006	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	68c69129-f1de-4538-997d-7e7f1cd24af6	2026-04-03 17:08:32.077119+00
1d16e6a0-9c83-4261-a021-09fe38aff8e0	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:25.552075+00
dbac73ca-f54f-4b77-93bc-5a8f5242b08f	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:25.608573+00
cf934e86-4840-496c-a2a7-fd2076281b1d	d41a6dbf-b002-4b46-ac48-f35492f3814d	68c69129-f1de-4538-997d-7e7f1cd24af6	2026-04-03 17:08:32.256958+00
bef782e5-8392-4778-89d8-0271588b2f98	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	fc6c6611-60cb-44d8-8de7-613f7d7869b5	2026-01-22 00:52:02.984901+00
d6342003-183f-4e98-bce1-ad283e462332	e6b29f58-e106-46c6-9eab-a1c2f119493b	8d390cb3-59e1-45c3-93a0-1459b74498a4	2026-01-22 00:53:10.990759+00
b2cd4fb2-b6ae-4bbf-99dc-aa2fec4f0b2b	e6b29f58-e106-46c6-9eab-a1c2f119493b	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:38:24.538938+00
7ae7c273-9878-4848-af19-f482ebbdad11	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	2026-01-22 01:04:07.02166+00
ea2bd376-af83-4f07-b653-fff434cee9e7	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	24027bca-5ea0-4b84-bbef-86cfe6eaf976	2026-01-22 01:04:15.870456+00
f46f78dd-492b-470d-99b5-ab2815bcebf3	dad214d1-eab3-4cb9-b3a9-45de14b2e778	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:57:45.639249+00
b7cd829f-04f0-4a51-a436-e3afe25924cb	e6b29f58-e106-46c6-9eab-a1c2f119493b	d40eddeb-94f1-4a8e-b05e-f8a02843b691	2026-01-22 01:12:20.170243+00
90191536-3463-4582-ac15-a3f320014a40	e6b29f58-e106-46c6-9eab-a1c2f119493b	1919a069-3c62-4408-9f6b-aba65bbdcce7	2026-01-22 01:16:43.211126+00
67964450-4250-413c-93f8-849a27cb7d6e	e6b29f58-e106-46c6-9eab-a1c2f119493b	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 11:24:03.820657+00
b86f2633-d963-4a29-90a5-3e798fc6b247	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	761258bd-d832-4b3e-8f14-bb8e3f934d26	2026-01-22 01:21:18.026521+00
6aa518b5-2bba-4e9e-8218-862bc3bf5ffe	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	761258bd-d832-4b3e-8f14-bb8e3f934d26	2026-01-22 01:21:18.049993+00
56fabc1b-46a7-406e-9ad1-3b9fec303462	d41a6dbf-b002-4b46-ac48-f35492f3814d	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	2026-01-22 01:24:25.931888+00
862bcecc-74e0-4d63-9b27-71c35739a6d3	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	65b54fdc-6983-4242-8b99-823e47f3a0a7	2026-01-22 01:27:27.438722+00
926cb17b-67ff-45e5-8972-6d67b12f2a8e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	65b54fdc-6983-4242-8b99-823e47f3a0a7	2026-01-22 01:27:27.834346+00
7da513cd-5a6d-4d8f-a704-519fc01661af	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	cfd6e3a8-82ce-4a45-b613-0e78fa463439	2026-01-22 01:30:28.124071+00
1de4c4f6-d8f1-42b3-b644-f6d23c9c70bc	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	2026-01-22 01:41:32.92115+00
5aacc184-099a-45cf-8007-6f74103bf35a	d41a6dbf-b002-4b46-ac48-f35492f3814d	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	2026-01-22 01:41:33.234194+00
ce94235a-bfd2-4af5-bd4d-cec91c128b15	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	2026-01-22 01:43:21.940468+00
a2f9ac32-55a4-4068-92a7-457af9915542	d41a6dbf-b002-4b46-ac48-f35492f3814d	1e2967ab-e057-4927-8fe4-b2f769a5a6df	2026-01-22 01:48:39.574348+00
28f9dee1-03fa-4525-b8b9-b686ac5fd4ee	28c62465-f2c9-4653-adae-0918420f06a3	2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	2026-01-22 01:52:17.301489+00
3aa58de6-39ec-4ac4-8ab4-2f0fb6aba556	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-22 01:54:37.330381+00
3b2e8296-63de-4e01-8dd3-fd75b97ebecb	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	2f835397-40fb-430f-96bb-3b23e988950e	2026-01-22 02:00:36.216266+00
f1b2be54-9650-49ba-bc3a-666fe28ec339	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	5c53db2c-057e-4bf6-9782-31a25c74e269	2026-01-22 02:02:52.766301+00
36724379-3f94-4e31-9264-9b70b1a1d829	e6b29f58-e106-46c6-9eab-a1c2f119493b	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	2026-01-22 02:04:29.634603+00
b778a85a-9e03-41e0-b55e-bb1d0dc1f1f4	e6b29f58-e106-46c6-9eab-a1c2f119493b	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	2026-01-22 02:09:19.589373+00
5fcb7f8d-43c8-4bf9-b52e-0ce9ea7d7f6c	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	2026-01-22 02:11:16.799223+00
a64c3550-f480-4c64-87d9-321079ec078b	28c62465-f2c9-4653-adae-0918420f06a3	143a5beb-1342-40f7-b9ef-3431b4c44da4	2026-01-22 02:12:27.669302+00
0d0ff034-8da4-431c-b5cc-76f842a39758	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	2026-01-22 02:15:17.933397+00
ac00f002-6db0-40f6-bdb1-6d19bbfcebe0	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	2026-01-22 02:23:48.248329+00
d45ba413-5de5-4807-bb25-b15874f72005	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:14.50864+00
6bdcbdc8-5a23-4e9f-8395-ce032e4425f0	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	44d5783f-4535-4541-bb10-efcf81eec4a3	2026-01-22 03:10:30.716889+00
3c8d3bb6-021e-4f06-9315-9405539e9957	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	44d5783f-4535-4541-bb10-efcf81eec4a3	2026-01-22 03:10:30.912888+00
9930abf3-c01a-40b7-bd02-0daa18d4fde1	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	2026-01-22 03:13:14.099833+00
a8b8823c-27a1-40d7-8235-c4f3a58498fd	e6b29f58-e106-46c6-9eab-a1c2f119493b	6fb4e6fd-e573-4551-8480-91aaa0d63b80	2026-01-22 03:14:43.043696+00
7bf94c73-a6a8-4b43-9d29-0c541d520aa1	28c62465-f2c9-4653-adae-0918420f06a3	6d277ecb-1abf-4361-b0c3-0948f3b8d234	2026-01-22 03:16:57.15031+00
f97d9abb-5c35-4843-a1f1-4605d5787786	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	7646b385-d2e4-4b95-acc5-c816e3cd1412	2026-01-22 03:18:28.545562+00
668c679c-2654-4353-ac89-fde00bf06736	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	2026-01-22 03:19:52.661191+00
ddea7c8a-3c91-4573-9410-292f8bb4708d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	2026-01-22 03:19:52.965329+00
465ac305-07d7-4d0e-a682-011da42d6d3d	e6b29f58-e106-46c6-9eab-a1c2f119493b	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	2026-01-22 03:19:53.022427+00
a46abe1b-b8f1-4ae1-9541-1b7f6efcfe4f	e6b29f58-e106-46c6-9eab-a1c2f119493b	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:45:35.770896+00
d5eaf09e-361e-4235-b706-40611b33f8cb	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:39.201689+00
fb2f000c-176a-4e26-9e34-8648f83974ba	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:45:35.885853+00
bbd34c89-98fb-40df-8a81-0715c18dd79f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 05:05:51.335231+00
0667915b-896e-439c-9372-4f31b953b863	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:02:29.634729+00
946c86e0-2f58-4a95-af66-fe196bfb9a9f	d41a6dbf-b002-4b46-ac48-f35492f3814d	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:02:29.741582+00
6a7872aa-7aae-462c-99b2-df0a7f39108f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	36597eb2-1818-4c3f-b98e-6ba968c77dc4	2026-01-21 09:06:48.865202+00
977e9975-98ec-49a7-8c8d-a48700390e13	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	36597eb2-1818-4c3f-b98e-6ba968c77dc4	2026-01-21 09:06:48.884573+00
464173dd-f5e4-4a60-89d5-75636cff7420	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	9d0ef483-3495-446e-a744-f290c1e4d509	2026-03-25 10:50:05.838875+00
6b8d79ee-bf21-4850-82e0-174a204ad545	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	be1c325d-845a-4e30-bdc0-0a4b90419b71	2026-01-21 09:15:47.844066+00
3e6a85f5-79c6-494a-a5ac-cf1af0b9a529	28c62465-f2c9-4653-adae-0918420f06a3	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:03.833312+00
ba7b9225-0075-4d67-b365-0f8ca233a52e	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:03.869575+00
d278fc46-411a-43c0-a430-6b95a55d077a	28c62465-f2c9-4653-adae-0918420f06a3	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:06:36.201538+00
678dc61f-d7b0-478c-9025-11fe24c7dc19	d41a6dbf-b002-4b46-ac48-f35492f3814d	6f195582-f9ea-4c5e-a7d5-21836e0ebff3	2026-01-21 09:27:03.90263+00
5d041221-5a71-4b52-990f-ebf9665ff78d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:10.561724+00
a58b0585-0f49-4f35-9a4e-25aada1e0238	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	de671e87-8ed3-480f-a6af-d7707a4b75c9	2026-01-21 09:36:44.736615+00
5a02bc1a-4a04-4d6e-becd-f0c24e738559	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:31:22.67759+00
8f487903-78cf-4074-9146-b66fe6ffff18	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:07:51.023369+00
e967162a-2655-4050-86fe-17ad8f2d747a	e6b29f58-e106-46c6-9eab-a1c2f119493b	b7215524-a4d6-4661-a7c3-83643d53bc8d	2026-01-21 09:44:49.135569+00
63c3a339-ce92-4b40-b5f4-9f49daa1238c	e6b29f58-e106-46c6-9eab-a1c2f119493b	02d46548-0441-412d-b12b-f0830a264840	2026-01-21 09:54:20.889205+00
c201cfe5-74a0-44d8-b5b6-103e126d243f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:19:31.445836+00
f39c006f-844c-4ee0-8f04-5640f78e8d4a	e6b29f58-e106-46c6-9eab-a1c2f119493b	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	2026-01-21 10:26:13.420974+00
501f2cb3-8fd6-430a-81a7-af656c2c7897	e6b29f58-e106-46c6-9eab-a1c2f119493b	4975439b-f977-44a7-b6ac-cecd2732e105	2026-01-21 10:28:09.705463+00
8d2e96fa-3ba2-49c3-a082-a3dcf0ee3ca5	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	2026-01-21 10:31:35.6847+00
e5891f17-1c8b-45ec-9325-06453b0532ff	d41a6dbf-b002-4b46-ac48-f35492f3814d	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	2026-01-21 10:31:35.928965+00
fa177c03-66ff-4390-87b5-d1bc6f1d6e30	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	2026-01-21 10:31:35.968609+00
0d48178a-5122-4db5-83a0-05b804adf116	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:07:51.026357+00
5a1e5170-b09b-4381-b8ac-d9699cffb030	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:07:51.309763+00
b2b27a5c-fabc-4e5f-b00f-dedb9effddf7	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	d4e15dfe-84c9-489a-997f-4303eb9de453	2026-01-21 12:17:53.853143+00
1d3b7866-f1e3-4557-ad38-4678ac263cbb	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:38:24.54542+00
2a05c8de-1244-46d7-86d4-8f6e01758907	d41a6dbf-b002-4b46-ac48-f35492f3814d	511c3f9d-9125-4586-b351-45348ad11743	2026-01-22 00:35:08.077191+00
8cebb25d-1670-4e0d-803e-a0b057d30301	dad214d1-eab3-4cb9-b3a9-45de14b2e778	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-09-02 12:29:00.135379+00
8103df19-783d-4aea-a18b-78f9ba805021	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	50644fc3-8363-44f2-836e-61b3a252478d	2026-01-22 00:41:41.066805+00
17775434-7be9-4f80-8209-c8dacb5ee571	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 11:24:03.83252+00
e1f7d196-c0c1-42b1-9798-4e3d594eedfe	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:42:48.559102+00
0194ae32-efef-45fe-b0d8-a0e2bb67a7b7	28c62465-f2c9-4653-adae-0918420f06a3	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:25.556087+00
33d7566b-e50c-4390-bf86-1100067a5c12	d41a6dbf-b002-4b46-ac48-f35492f3814d	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:25.608262+00
998a68d6-84b6-4a6e-8f74-7420886b3380	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	791939bf-486b-4d03-98df-7eefd4aa15f2	2026-01-22 00:48:40.502292+00
11160c2d-95d8-421f-ada5-6ed49f0d864d	d41a6dbf-b002-4b46-ac48-f35492f3814d	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	2026-01-22 01:04:06.998541+00
6d405349-ecce-45d0-840d-e3c0e1df4c50	d41a6dbf-b002-4b46-ac48-f35492f3814d	71415285-c1cb-4855-82ee-37585c51eef9	2026-01-22 01:09:18.942337+00
2e94ddcd-2cb8-4dca-b804-1f3c4edd6d0b	28c62465-f2c9-4653-adae-0918420f06a3	d40eddeb-94f1-4a8e-b05e-f8a02843b691	2026-01-22 01:12:20.186413+00
6dfc750a-4480-469f-ba97-adb168316349	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	1919a069-3c62-4408-9f6b-aba65bbdcce7	2026-01-22 01:16:43.20945+00
df8815bb-e210-47c0-8628-a19cb7968368	28c62465-f2c9-4653-adae-0918420f06a3	1919a069-3c62-4408-9f6b-aba65bbdcce7	2026-01-22 01:16:43.228783+00
2a6803ab-4cee-49c9-ada1-5c8d65830d32	e6b29f58-e106-46c6-9eab-a1c2f119493b	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:18:45.605252+00
ba2984af-42ab-416a-8954-61c61e59587e	d41a6dbf-b002-4b46-ac48-f35492f3814d	761258bd-d832-4b3e-8f14-bb8e3f934d26	2026-01-22 01:21:18.068983+00
826fa66c-b398-4a6e-9046-2437d5d549d0	28c62465-f2c9-4653-adae-0918420f06a3	f8e9a265-897e-43b8-adee-a431e9c3bee9	2026-01-22 01:22:47.167023+00
bceec9c1-a0d3-44e4-961a-ea1394f44f3e	28c62465-f2c9-4653-adae-0918420f06a3	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	2026-01-22 01:26:02.142812+00
990f6eab-8706-4559-84ac-63fd8041468b	e6b29f58-e106-46c6-9eab-a1c2f119493b	65b54fdc-6983-4242-8b99-823e47f3a0a7	2026-01-22 01:27:27.446307+00
8b622192-d82f-42f6-bb46-567bb553e8b9	28c62465-f2c9-4653-adae-0918420f06a3	cfd6e3a8-82ce-4a45-b613-0e78fa463439	2026-01-22 01:30:28.103519+00
243635aa-5aa6-4757-9be9-b4a260b25999	d41a6dbf-b002-4b46-ac48-f35492f3814d	5981f73f-c8eb-46ca-97cf-61bb2373bc52	2026-01-22 01:38:42.524942+00
7d05e052-6447-4e67-9fed-4cff9295dcc0	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	2026-01-22 01:41:33.260485+00
700b4337-4657-42cf-a423-d500ed7e6c65	28c62465-f2c9-4653-adae-0918420f06a3	d8ea0add-dca7-4d96-9a64-1ecdde0292b3	2026-01-22 01:43:21.940483+00
68180671-9441-4221-910d-851a3489965a	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	29573c2b-fdf5-4831-974c-9851cb4d9fc3	2026-01-22 01:46:59.237992+00
6575ca39-2a6b-4b71-ae69-adfc2618283f	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	29573c2b-fdf5-4831-974c-9851cb4d9fc3	2026-01-22 01:46:59.282573+00
4dea6395-0d8a-4e53-9933-d5c69d9d6e34	d41a6dbf-b002-4b46-ac48-f35492f3814d	29573c2b-fdf5-4831-974c-9851cb4d9fc3	2026-01-22 01:46:59.315725+00
aaa18c22-14b3-4cb9-a60c-ce6858ac3ef8	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	1e2967ab-e057-4927-8fe4-b2f769a5a6df	2026-01-22 01:48:39.575069+00
74934384-8c0c-488d-8dbd-4abd1075a3c3	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	b9163fcb-75ec-4a35-8d45-1547315401ac	2026-01-22 01:53:21.70187+00
dafab5db-9eb7-4108-a813-fac1caad6fd2	e6b29f58-e106-46c6-9eab-a1c2f119493b	b9163fcb-75ec-4a35-8d45-1547315401ac	2026-01-22 01:53:21.740415+00
75b93eb6-2e68-41b4-b94b-12406714311d	d41a6dbf-b002-4b46-ac48-f35492f3814d	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	2026-01-22 01:55:50.754751+00
b8176efb-653b-42a3-9415-c3352f367f4f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	5c53db2c-057e-4bf6-9782-31a25c74e269	2026-01-22 02:02:52.767794+00
be66693e-c97d-4d15-a5ca-7164281eb9e1	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	143a5beb-1342-40f7-b9ef-3431b4c44da4	2026-01-22 02:12:27.672965+00
8260d0da-b10c-4c4a-a696-27706a900a3e	d41a6dbf-b002-4b46-ac48-f35492f3814d	9a92b411-973c-485e-9572-541a3989be22	2026-01-22 02:16:22.771869+00
5844c76c-29bf-4eac-abf2-831c9f213cc2	d41a6dbf-b002-4b46-ac48-f35492f3814d	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	2026-01-22 02:17:33.037251+00
bfc9e8e1-59d8-46ed-9e55-0fd3b7336ea0	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	2026-01-22 02:17:33.06189+00
df9219d1-4c86-4d8f-82cc-b45b35f8ac63	e6b29f58-e106-46c6-9eab-a1c2f119493b	a3f52365-5616-4ae8-8b9d-dfba52c94270	2026-01-22 02:20:10.812695+00
f8263d71-0011-426b-b9fc-6619dda2153d	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	37868e58-66d7-4803-a276-eb6da072b972	2026-01-22 02:21:45.641452+00
458c29ad-863e-4966-87c0-d84af5c38e54	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	2026-01-22 02:23:48.244146+00
b85445cd-ac41-4a9d-bf65-d4a5373eb2dd	e6b29f58-e106-46c6-9eab-a1c2f119493b	f404aa02-8c39-4c40-850e-f7f13b9a2adb	2026-01-22 02:25:14.512606+00
0197dc0a-f4f0-4565-b267-aa1078cc403c	e6b29f58-e106-46c6-9eab-a1c2f119493b	4104824d-4aaa-4ce4-b304-d1074d61fba6	2026-01-22 03:11:54.27111+00
4ba84e59-5550-4756-b16e-a0dcb3233692	d41a6dbf-b002-4b46-ac48-f35492f3814d	6fb4e6fd-e573-4551-8480-91aaa0d63b80	2026-01-22 03:14:43.086194+00
fc414014-1b49-4899-b57e-58611303601e	28c62465-f2c9-4653-adae-0918420f06a3	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-19 16:09:08.889097+00
e5b2611d-0284-409a-ab91-72e52aec4717	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:16:44.302401+00
3948eaea-bc94-4823-ab1f-521b33feaddf	d41a6dbf-b002-4b46-ac48-f35492f3814d	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:45:35.844222+00
27d2f3ad-8dac-4f56-9f4b-7a064be3ec95	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:45:35.902889+00
286ab807-5bee-4141-8c35-9de0ece95fc8	d41a6dbf-b002-4b46-ac48-f35492f3814d	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-24 06:08:20.941549+00
8e753075-6ac7-49f2-b049-f5c47408906b	e6b29f58-e106-46c6-9eab-a1c2f119493b	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:39.204346+00
32d942bd-0c15-45f2-bc56-db9914386f20	d41a6dbf-b002-4b46-ac48-f35492f3814d	1c1df301-da2b-4ed7-aa41-bf216a66d009	2026-01-20 06:09:14.686788+00
b494e371-89b5-4c15-a77c-5345b3c5c5a1	e6b29f58-e106-46c6-9eab-a1c2f119493b	36597eb2-1818-4c3f-b98e-6ba968c77dc4	2026-01-21 09:06:48.870961+00
a60877da-5484-49d7-a568-86c74d5709ad	28c62465-f2c9-4653-adae-0918420f06a3	1c1df301-da2b-4ed7-aa41-bf216a66d009	2026-01-20 06:09:14.70281+00
1cc55295-af31-46f1-a40a-682ee386ba00	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 05:05:51.342592+00
97c8b8b8-68cb-4848-ad67-903d558b4bd1	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	9d0ef483-3495-446e-a744-f290c1e4d509	2026-03-25 10:50:06.022963+00
05223632-65a8-449e-a37c-31e17fd52094	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	c69d726e-a55a-4e43-ac7b-270a4ab83e85	2026-03-25 12:39:17.408904+00
8d58c2e7-09bd-49c1-bd77-8eb9b5ff6e0b	d41a6dbf-b002-4b46-ac48-f35492f3814d	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:06:36.204611+00
25dbff01-2ea6-45d8-971d-543cef41bffd	d41a6dbf-b002-4b46-ac48-f35492f3814d	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:31:22.704407+00
0885cd92-ce5b-49f7-b803-c62750e4742f	28c62465-f2c9-4653-adae-0918420f06a3	b7215524-a4d6-4661-a7c3-83643d53bc8d	2026-01-21 09:44:49.145939+00
1a9f0bb3-08f8-4682-9fd4-9848c014a237	e6b29f58-e106-46c6-9eab-a1c2f119493b	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:07:51.081614+00
0888969f-11ac-434b-ba99-e418764922e5	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 10:19:31.449074+00
79254514-e678-4cd2-b8e3-edf92d43a496	28c62465-f2c9-4653-adae-0918420f06a3	8c6c740c-b564-48ae-9b85-a164e99155fd	2026-01-21 10:22:42.775731+00
b3b248c3-08bf-43e8-80d9-85f93bae8724	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:38:24.482669+00
8f1abda9-03f0-45e4-a876-6c9ccd1ad442	e6b29f58-e106-46c6-9eab-a1c2f119493b	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:57.111456+00
27d9732a-9508-4b3e-86d8-87b998c1c269	d41a6dbf-b002-4b46-ac48-f35492f3814d	e7a0fa21-d8ac-4223-88d2-a22f26d849a9	2026-01-21 10:26:13.428115+00
7eb48a98-ba4b-47e7-aa79-b209fb79b4a5	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c0fb76fc-499a-4cfc-af09-670d86c6f6b8	2026-01-21 10:27:18.608609+00
8b3aaa25-1f5e-43dc-85b0-7cb5b988fbda	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:57.110501+00
5584109e-8177-41ae-8d63-30eafd18ea5d	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	1c1df301-da2b-4ed7-aa41-bf216a66d009	2026-01-20 06:13:01.510618+00
77652c65-e0d2-4c0f-95cb-25a64a348aa1	d41a6dbf-b002-4b46-ac48-f35492f3814d	\N	2026-01-21 02:45:14.247217+00
d53befba-0ca8-4b35-baa7-b4869603bbab	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 04:46:20.660738+00
f3367af4-270d-4094-95c4-40be6dc79dc6	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	76fb9807-6735-478f-a363-79fb2a20be7f	2026-01-21 04:47:21.05773+00
cf67385b-370d-4100-b987-d6841f59a624	dad214d1-eab3-4cb9-b3a9-45de14b2e778	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 11:24:04.243798+00
6c5b471d-3992-449a-b4dd-016daa4fafcd	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	2026-01-21 10:31:35.677653+00
43d3c1ab-75a0-4817-8751-b444eb93882e	d41a6dbf-b002-4b46-ac48-f35492f3814d	\N	2026-01-21 04:48:28.594946+00
4955b434-5252-4796-a7ef-3015bdff9795	e6b29f58-e106-46c6-9eab-a1c2f119493b	00c9aa5d-0912-4be0-9d96-d90d74d25438	2026-01-21 10:32:46.024227+00
8e77f38b-f3ac-486f-b281-f83e77ec27a1	28c62465-f2c9-4653-adae-0918420f06a3	766613de-ab18-45a2-9c57-ab6e838c91aa	2026-01-21 10:34:40.834691+00
480c7daa-fd26-4cef-8d7c-685a1cd0eb6c	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	511c3f9d-9125-4586-b351-45348ad11743	2026-01-22 00:35:08.080887+00
a56f3d5d-046a-4864-9400-828804210a61	28c62465-f2c9-4653-adae-0918420f06a3	c9af8e81-b717-4d88-9a7c-5f821c0a384e	2026-01-22 00:38:43.548129+00
02a5c209-bd7b-4a23-b5b6-a10873dcafb3	d41a6dbf-b002-4b46-ac48-f35492f3814d	50644fc3-8363-44f2-836e-61b3a252478d	2026-01-22 00:41:41.173168+00
68650fb3-723d-4489-8deb-80d2a7093e62	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:45:54.833838+00
84dc4cd5-5bca-4d59-8d60-a2ce86de1a92	e6b29f58-e106-46c6-9eab-a1c2f119493b	c35ce40a-b44f-49a7-aa8e-ed95060759b1	2026-01-22 00:45:55.050087+00
e2186e10-60db-43ab-a707-978eca5b8cb9	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	6137e67a-d461-46fd-ac2a-17ce6c29b22f	2026-01-22 00:47:25.569225+00
7ce29523-d5ee-4d3d-b928-f7b5a8a60426	28c62465-f2c9-4653-adae-0918420f06a3	fc6c6611-60cb-44d8-8de7-613f7d7869b5	2026-01-22 00:52:02.995228+00
e3b00367-e1de-4601-a34b-b5a17c45de17	d41a6dbf-b002-4b46-ac48-f35492f3814d	8d390cb3-59e1-45c3-93a0-1459b74498a4	2026-01-22 00:53:11.019345+00
4577614c-44d8-411f-bb35-6338596fc4f6	e6b29f58-e106-46c6-9eab-a1c2f119493b	24027bca-5ea0-4b84-bbef-86cfe6eaf976	2026-01-22 01:04:15.469107+00
513a0d15-a2bf-4554-b42c-6408935aa2d6	e6b29f58-e106-46c6-9eab-a1c2f119493b	71415285-c1cb-4855-82ee-37585c51eef9	2026-01-22 01:09:18.960588+00
eb56d532-4b54-4201-8ff3-00abe602c1e2	28c62465-f2c9-4653-adae-0918420f06a3	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	2026-01-22 01:13:27.887064+00
0219db6e-be65-42f6-a780-a3ce6a52d8b9	d41a6dbf-b002-4b46-ac48-f35492f3814d	31b8206a-ea5d-41cf-968e-6f19b87aba62	2026-01-22 01:18:45.609612+00
1b81ae2e-a47c-4b15-8670-aec7167697f4	e6b29f58-e106-46c6-9eab-a1c2f119493b	761258bd-d832-4b3e-8f14-bb8e3f934d26	2026-01-22 01:21:18.040302+00
95322876-234d-4928-8ee9-6bcbb830d4b7	d41a6dbf-b002-4b46-ac48-f35492f3814d	f8e9a265-897e-43b8-adee-a431e9c3bee9	2026-01-22 01:22:47.167294+00
13c2bb8d-1a88-4d84-880e-ee2ef7579df1	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	2026-01-22 01:26:01.92506+00
cfedebef-2d20-40ac-84b3-e8858dc3b448	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	65b54fdc-6983-4242-8b99-823e47f3a0a7	2026-01-22 01:27:27.450156+00
ab2ad28e-bc6d-4f0c-8327-16f23ae455fc	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	cfd6e3a8-82ce-4a45-b613-0e78fa463439	2026-01-22 01:30:28.130098+00
f68c8f3e-cf30-42de-98ea-fbcf02b4be5d	28c62465-f2c9-4653-adae-0918420f06a3	4733c4f2-b333-4f33-8526-490f50a57499	2026-01-22 01:39:45.218986+00
6e344490-4958-4abc-a06e-e14f3924fbd7	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	2026-01-22 01:41:33.266917+00
80187961-a1a4-45b8-837b-cd033eb40f2b	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	d28140c0-4739-4adb-b40c-dad97b2551bd	2026-01-22 01:44:51.302797+00
59781a8e-dd5a-4fa1-9870-53bc38a74a76	28c62465-f2c9-4653-adae-0918420f06a3	1e2967ab-e057-4927-8fe4-b2f769a5a6df	2026-01-22 01:48:39.589386+00
cc125940-ebfd-4665-8ea4-7df99804d731	e6b29f58-e106-46c6-9eab-a1c2f119493b	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	2026-01-22 01:50:10.348597+00
c8752e46-3c5d-48bb-841a-142e9a044da0	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	b9163fcb-75ec-4a35-8d45-1547315401ac	2026-01-22 01:53:21.704721+00
4305fac3-1db9-41fd-bba0-ff3b6aad9a7f	d41a6dbf-b002-4b46-ac48-f35492f3814d	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-22 01:54:37.348155+00
cfe24dad-eb76-486a-9795-34aa68f3bfbf	28c62465-f2c9-4653-adae-0918420f06a3	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	2026-01-22 01:55:50.754749+00
54fd3065-98c6-4a8d-8c24-66b714cfd7b5	e6b29f58-e106-46c6-9eab-a1c2f119493b	2f835397-40fb-430f-96bb-3b23e988950e	2026-01-22 02:00:36.553074+00
2d76af6c-a4d2-4fd8-aeac-a679d074dfb1	28c62465-f2c9-4653-adae-0918420f06a3	5c53db2c-057e-4bf6-9782-31a25c74e269	2026-01-22 02:02:52.774674+00
96661bf7-52b3-4a89-afd8-056e493833c2	d41a6dbf-b002-4b46-ac48-f35492f3814d	5c53db2c-057e-4bf6-9782-31a25c74e269	2026-01-22 02:02:53.122064+00
6fcd6844-bd92-4052-8a84-a138c231d627	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	2026-01-22 02:09:19.601059+00
fb6c8c0e-ed6c-4109-a93e-0c740674d38e	d41a6dbf-b002-4b46-ac48-f35492f3814d	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	2026-01-22 02:11:16.806683+00
f8af0651-ce70-4656-9aac-ea98c0fad8ec	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	2026-01-22 02:15:17.905946+00
62843fb4-9378-43e0-86de-05dcc133bd5b	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	9a92b411-973c-485e-9572-541a3989be22	2026-01-22 02:16:22.741187+00
5e623e8e-beb2-436c-8a50-aea47de26770	e6b29f58-e106-46c6-9eab-a1c2f119493b	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	2026-01-22 02:17:33.034363+00
36c48892-cc14-4988-b682-e73ed2286531	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	2026-01-22 02:18:53.629333+00
3978cf51-f8e8-4992-bd99-cb84a9fad6c9	28c62465-f2c9-4653-adae-0918420f06a3	a3f52365-5616-4ae8-8b9d-dfba52c94270	2026-01-22 02:20:10.837659+00
7f181d4a-11b6-42bd-9bcc-1603ce929dd5	d41a6dbf-b002-4b46-ac48-f35492f3814d	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	2026-01-22 02:23:48.247998+00
25ac8384-44ce-482b-acad-7ebbe762f9f6	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4104824d-4aaa-4ce4-b304-d1074d61fba6	2026-01-22 03:11:54.271065+00
24901947-5272-423e-b781-929af98183d6	d41a6dbf-b002-4b46-ac48-f35492f3814d	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	2026-01-22 03:13:13.859814+00
4e9452d1-b041-4545-99f5-dd9ce5969ccf	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	6d277ecb-1abf-4361-b0c3-0948f3b8d234	2026-01-22 03:16:56.79755+00
62856322-ea1a-4d7f-a4fe-00463ac6a84d	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	6d277ecb-1abf-4361-b0c3-0948f3b8d234	2026-01-22 03:16:57.153485+00
fbcf5ce3-f579-4d08-bc1b-70445a590b52	28c62465-f2c9-4653-adae-0918420f06a3	7646b385-d2e4-4b95-acc5-c816e3cd1412	2026-01-22 03:18:28.542779+00
f5256a4d-b506-439c-a069-3c7c2366fe89	28c62465-f2c9-4653-adae-0918420f06a3	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	2026-01-22 03:19:53.027643+00
f46e22ce-d658-4b9f-b5e9-7bfe09105f76	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	35dca33b-9d87-448c-80f5-a93eb0940c7f	2026-01-22 03:22:24.86053+00
76a1e64d-b9e5-4fb7-a269-cc4e00c2ccb1	d41a6dbf-b002-4b46-ac48-f35492f3814d	9ec8512b-24ba-4581-a362-6f7a3a6c0235	2026-01-22 03:24:07.904132+00
c656d35f-1a2e-42fb-8480-10a3748198b3	28c62465-f2c9-4653-adae-0918420f06a3	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	2026-01-22 03:26:34.003882+00
24f9e656-e0cc-4156-9a6b-f181cbba28d4	e6b29f58-e106-46c6-9eab-a1c2f119493b	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	2026-01-22 03:26:34.00066+00
dea8b9e7-de95-4505-a2d3-eb0b69662e32	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	2026-01-22 03:26:34.040173+00
8026f09b-784a-4c8c-ac47-3909440b20f1	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-24 06:08:21.004598+00
7ae084b8-5306-4423-9fac-50a48d3edc1a	d41a6dbf-b002-4b46-ac48-f35492f3814d	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	2026-01-22 03:26:34.038144+00
c526e8ef-2ac9-42ac-9cdc-990157ac8ff4	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:39.201833+00
1a19104d-ce22-4d05-b878-6251f518121b	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	2026-01-22 03:26:34.052308+00
30935f10-d500-4bb5-8316-2b38d7d85a87	d41a6dbf-b002-4b46-ac48-f35492f3814d	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 05:05:51.354211+00
6d8a6c87-659f-4316-af43-05152fa00da3	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	2026-01-22 03:26:34.031357+00
8cc6b154-63f9-4f9b-b09f-3c5a8fffc08b	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e15551b8-af10-46c7-b62e-b6736ca520cb	2026-01-22 03:29:27.126314+00
60b3ca98-c568-41b3-bef6-379762e4a3d1	e6b29f58-e106-46c6-9eab-a1c2f119493b	e15551b8-af10-46c7-b62e-b6736ca520cb	2026-01-22 03:29:27.135086+00
1f0de29b-d1ff-4753-94da-1be9fd4135aa	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e15551b8-af10-46c7-b62e-b6736ca520cb	2026-01-22 03:29:27.36408+00
88ac8b02-afa3-4295-a012-f2c7ca60b034	28c62465-f2c9-4653-adae-0918420f06a3	9d0ef483-3495-446e-a744-f290c1e4d509	2026-03-25 10:50:06.02261+00
3940dd3a-7633-4d0b-881b-e6bbefb62f35	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	c69d726e-a55a-4e43-ac7b-270a4ab83e85	2026-03-25 12:39:17.416165+00
c24b2199-5ed9-4d59-9ebf-394cc5c5d3b0	d41a6dbf-b002-4b46-ac48-f35492f3814d	e15551b8-af10-46c7-b62e-b6736ca520cb	2026-01-22 03:29:27.379845+00
4a92fe33-85ac-4dff-9eb5-7b191b9c880f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:06:36.243811+00
bfbffe53-7af2-4442-89ff-25d7bbe01cbc	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e15551b8-af10-46c7-b62e-b6736ca520cb	2026-01-22 03:29:27.399723+00
1eac2471-195a-4045-812e-c7e9215af55d	28c62465-f2c9-4653-adae-0918420f06a3	e15551b8-af10-46c7-b62e-b6736ca520cb	2026-01-22 03:29:27.412503+00
f29e12df-d2df-4e0a-b2ec-3bc2eaae26ef	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	88818637-080c-4c99-ae7d-265f4f7ada85	2026-01-22 03:30:47.813558+00
c2453366-20d6-45cb-ab64-e3d7560ee6b4	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	88818637-080c-4c99-ae7d-265f4f7ada85	2026-01-22 03:30:47.813777+00
5fbd4c6b-4262-4373-a543-ebc99534119c	db776908-452a-4e00-b41b-e45390791fc9	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:34:53.269157+00
71fb415f-9806-486a-800e-e634b7aa38f7	28c62465-f2c9-4653-adae-0918420f06a3	88818637-080c-4c99-ae7d-265f4f7ada85	2026-01-22 03:30:47.849032+00
ab4d9921-8e15-40ea-9ac6-e7312b61137a	1ebe1d41-bac7-4807-8c2f-c82ff2512cf6	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:34:53.271796+00
71829e3c-81a0-4518-b25e-fe312c83d187	d41a6dbf-b002-4b46-ac48-f35492f3814d	88818637-080c-4c99-ae7d-265f4f7ada85	2026-01-22 03:30:47.857393+00
165ce9f2-7a17-465e-8d1c-80d84fb725fc	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	88818637-080c-4c99-ae7d-265f4f7ada85	2026-01-22 03:30:47.864872+00
2125e420-735d-47fd-9c18-2060a73dc3e1	e6b29f58-e106-46c6-9eab-a1c2f119493b	88818637-080c-4c99-ae7d-265f4f7ada85	2026-01-22 03:30:47.867844+00
fd93f1b0-88a4-42bf-94f6-35c19b6964e7	28c62465-f2c9-4653-adae-0918420f06a3	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:07:51.088162+00
f3a42dca-0c55-46d0-9fa3-b9b39f8beee2	28c62465-f2c9-4653-adae-0918420f06a3	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:38:24.457734+00
c653e0d2-8831-4a6b-88fa-ad53fed87079	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	8ab57ed4-2107-4880-88a5-93e07bc747d0	2026-01-22 03:32:35.649503+00
4fd9f549-a62f-4f09-ab52-00757f24f82a	e6b29f58-e106-46c6-9eab-a1c2f119493b	8ab57ed4-2107-4880-88a5-93e07bc747d0	2026-01-22 03:32:35.674927+00
b9835abe-0644-428f-b0d3-697d2258fd9e	d41a6dbf-b002-4b46-ac48-f35492f3814d	8ab57ed4-2107-4880-88a5-93e07bc747d0	2026-01-22 03:32:35.713639+00
0f58c725-236c-42a1-b068-7d8d826584e0	d41a6dbf-b002-4b46-ac48-f35492f3814d	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:57.120293+00
c4c69368-78e8-42a7-b04c-89632814a6ed	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8ab57ed4-2107-4880-88a5-93e07bc747d0	2026-01-22 03:32:35.714691+00
0f9d3f70-b23c-4150-8dc8-9550eced661c	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	8ab57ed4-2107-4880-88a5-93e07bc747d0	2026-01-22 03:32:35.722517+00
0546e4f9-c000-4f91-875a-dd129de1c4d1	28c62465-f2c9-4653-adae-0918420f06a3	8ab57ed4-2107-4880-88a5-93e07bc747d0	2026-01-22 03:32:35.724814+00
a6bd7bbc-31c7-4423-bd20-a3a8162658d1	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	bc2344f4-66d6-4dcf-93fa-608871aeb1ba	2026-01-22 03:49:15.368415+00
535f742c-df39-420d-a14b-bc455b4a9d79	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	bc2344f4-66d6-4dcf-93fa-608871aeb1ba	2026-01-22 03:49:15.37135+00
a3168a8b-1115-4402-94d1-ddc1a02500c5	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	bc2344f4-66d6-4dcf-93fa-608871aeb1ba	2026-01-22 03:49:15.368318+00
82f46b3e-eb15-4710-9d7b-7b352b125065	e6b29f58-e106-46c6-9eab-a1c2f119493b	bc2344f4-66d6-4dcf-93fa-608871aeb1ba	2026-01-22 03:49:15.368278+00
808edf91-0256-454f-a3e2-1072120f8d7d	d41a6dbf-b002-4b46-ac48-f35492f3814d	bc2344f4-66d6-4dcf-93fa-608871aeb1ba	2026-01-22 03:49:15.602039+00
9c751af5-ce4d-4d07-9ddd-c6dca05a6f1b	28c62465-f2c9-4653-adae-0918420f06a3	bc2344f4-66d6-4dcf-93fa-608871aeb1ba	2026-01-22 03:49:15.662425+00
f14c2181-3eee-4f4a-9d0a-353c171cedef	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	dca20759-c2ff-496d-8d55-dd9230f92203	2026-01-22 03:50:23.025205+00
ced4440a-3e2d-4331-ac48-31458d8ccf99	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	dca20759-c2ff-496d-8d55-dd9230f92203	2026-01-22 03:50:23.042517+00
6e700cd8-b7d8-44ff-871f-46f0f5c6f726	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	dca20759-c2ff-496d-8d55-dd9230f92203	2026-01-22 03:50:23.343135+00
7f45ad7c-e2f3-4b0b-a3dc-4e1b06f9b2ce	28c62465-f2c9-4653-adae-0918420f06a3	dca20759-c2ff-496d-8d55-dd9230f92203	2026-01-22 03:50:23.347698+00
4c9a8e59-79d4-40ee-92f0-c471002f4cdf	e6b29f58-e106-46c6-9eab-a1c2f119493b	dca20759-c2ff-496d-8d55-dd9230f92203	2026-01-22 03:50:23.354839+00
4648130b-0d21-4bb7-9802-fbecd3072961	d41a6dbf-b002-4b46-ac48-f35492f3814d	dca20759-c2ff-496d-8d55-dd9230f92203	2026-01-22 03:50:23.366085+00
ef91751e-fe21-4ba6-b7dc-5d72c31287e0	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	24704bb6-2908-44a7-8098-4a188b527805	2026-01-22 03:53:18.82013+00
54126af1-b14f-4a5b-a947-165b854c4cfc	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	24704bb6-2908-44a7-8098-4a188b527805	2026-01-22 03:53:19.015331+00
8e858609-c7f2-438a-9414-4648063dffc8	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	24704bb6-2908-44a7-8098-4a188b527805	2026-01-22 03:53:19.037383+00
f4288102-945b-4b6b-8228-66f654fc6fea	d41a6dbf-b002-4b46-ac48-f35492f3814d	24704bb6-2908-44a7-8098-4a188b527805	2026-01-22 03:53:19.043179+00
2ad67afb-50c5-418c-a32d-f995bca2a2bc	e6b29f58-e106-46c6-9eab-a1c2f119493b	24704bb6-2908-44a7-8098-4a188b527805	2026-01-22 03:53:19.047638+00
4b06315b-6ee3-420e-94ba-8730aca96d84	28c62465-f2c9-4653-adae-0918420f06a3	24704bb6-2908-44a7-8098-4a188b527805	2026-01-22 03:53:19.129239+00
5c013884-14e1-4e9f-9a28-3afd41f71509	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	d8aa2361-6122-40a3-9ae2-93792e236825	2026-01-22 03:54:11.146412+00
ee37c89b-9d2e-4054-8e47-414f2afec4f9	e6b29f58-e106-46c6-9eab-a1c2f119493b	d8aa2361-6122-40a3-9ae2-93792e236825	2026-01-22 03:54:11.148411+00
540fdd72-1e84-4238-8de7-5cb05e0bd157	28c62465-f2c9-4653-adae-0918420f06a3	d8aa2361-6122-40a3-9ae2-93792e236825	2026-01-22 03:54:11.160759+00
5336e704-7dbc-44db-8d6f-a7ca5705c5a7	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	d8aa2361-6122-40a3-9ae2-93792e236825	2026-01-22 03:54:11.151282+00
b4d8b1c5-bf15-44cd-9748-08575ec1fb22	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	d8aa2361-6122-40a3-9ae2-93792e236825	2026-01-22 03:54:11.170628+00
ccd477ac-25d5-4d42-be1c-9b8166fde381	d41a6dbf-b002-4b46-ac48-f35492f3814d	d8aa2361-6122-40a3-9ae2-93792e236825	2026-01-22 03:54:11.180276+00
13baad50-34f3-49e4-a9d8-439341524fbc	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	2026-01-22 03:56:57.182501+00
0ec29598-5682-4dbf-adea-8a0eb4089658	d41a6dbf-b002-4b46-ac48-f35492f3814d	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	2026-01-22 03:56:57.214104+00
f703a0d2-22de-46ba-944a-8773961b8c2b	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	2026-01-22 03:56:57.220837+00
a2cbed4e-9dfb-4338-a917-53d7bca3bd6a	e6b29f58-e106-46c6-9eab-a1c2f119493b	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	2026-01-22 03:56:57.238882+00
0edfaa53-2328-425e-8d41-91bbb65784be	28c62465-f2c9-4653-adae-0918420f06a3	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	2026-01-22 03:56:57.24547+00
41c93595-0498-4e39-bd26-578a840d6f20	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	2026-01-22 03:56:57.247035+00
655263bf-dfa4-4b9e-bf27-55f7ce835f75	e6b29f58-e106-46c6-9eab-a1c2f119493b	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-22 18:58:09.256868+00
5a4a4e7e-8234-4d08-9ee1-11d353aa8d2a	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-22 18:58:09.457726+00
f7a745f2-4583-45a5-94f1-5312c3fc1856	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-22 18:58:09.544783+00
593f408d-e948-4923-a5a8-94b8e8d4c72d	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	2026-01-23 01:22:42.663665+00
9b80af24-6648-4972-8ac1-7fd50fa19d29	e6b29f58-e106-46c6-9eab-a1c2f119493b	2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	2026-01-23 01:22:42.937407+00
c7c9b8f6-228a-47ca-95c1-b9965da5416e	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	2026-01-23 01:22:42.941492+00
ee358d8a-d8b1-4803-a3cf-36aadeb57f0c	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	2026-01-23 01:22:42.950798+00
15d37c59-c77a-4525-8635-2907d02bf1a2	28c62465-f2c9-4653-adae-0918420f06a3	2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	2026-01-23 01:22:42.978975+00
883f4390-be6d-40ae-a9b4-94b8a4858c58	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-24 06:08:21.038916+00
587eaa76-66fc-4b0d-bdc4-9bf5f7d78570	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:39.014573+00
13260187-a2c4-47a9-bc84-4dcbe2b19bfe	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	9d0ef483-3495-446e-a744-f290c1e4d509	2026-03-25 10:50:06.036765+00
50826221-9fd5-488b-95f0-b62de8e5ef9c	28c62465-f2c9-4653-adae-0918420f06a3	c69d726e-a55a-4e43-ac7b-270a4ab83e85	2026-03-25 12:39:17.4218+00
7cad1e4f-e49d-47d7-be49-b27bbb95c24d	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:31.437842+00
925d76d8-bbef-4aaa-bd8f-e21d9bce2519	28c62465-f2c9-4653-adae-0918420f06a3	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:31.452582+00
d7190efb-84fc-4c94-aaf4-cf0999bfae87	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:31.623217+00
70947460-1880-4fe7-9c6e-682350e89ad6	e6b29f58-e106-46c6-9eab-a1c2f119493b	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:31.625257+00
3f5a7fee-77d1-454b-be3f-5e3c7763811a	d41a6dbf-b002-4b46-ac48-f35492f3814d	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:07:51.305994+00
be32fc95-e609-455a-b092-f155ba947e9f	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-06-09 11:24:57.883621+00
95f719c4-5d3e-4eca-ab09-2b0bc72e60b0	28c62465-f2c9-4653-adae-0918420f06a3	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:57.110042+00
351d2092-1ade-4c38-9eda-9e387ae85c22	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:57.424369+00
429b3143-fe9d-402f-a4e5-a89114c3235d	d41a6dbf-b002-4b46-ac48-f35492f3814d	2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	2026-01-23 01:22:43.037646+00
100897c0-72d7-4e13-a39e-c081660e0c5a	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-23 10:39:18.940116+00
d5989a86-1f4f-47ce-b152-c09995f2baad	28c62465-f2c9-4653-adae-0918420f06a3	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-23 10:39:18.933842+00
101617fb-7b88-4b8e-8810-5ce8a51708d2	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-23 10:39:18.93713+00
8cdd4c41-4fdf-4bee-9a9f-73cf2129e887	28c62465-f2c9-4653-adae-0918420f06a3	\N	2026-01-24 08:37:33.443313+00
d55ab760-fa3e-4f9d-872e-73b933c1d2fc	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-23 10:39:18.936042+00
d1cfe1f5-860e-438f-8cdf-ae06a8fd34f3	d41a6dbf-b002-4b46-ac48-f35492f3814d	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-23 10:39:18.934487+00
88caaff4-1971-4759-903a-6523755a3ed9	d41a6dbf-b002-4b46-ac48-f35492f3814d	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:39.291009+00
c3cfe36a-83d9-4f28-83c8-4b6c03e18273	e6b29f58-e106-46c6-9eab-a1c2f119493b	9d0ef483-3495-446e-a744-f290c1e4d509	2026-03-25 10:50:06.03608+00
ca1dc6fd-b036-4ffa-b27f-490fd9255e5f	e6b29f58-e106-46c6-9eab-a1c2f119493b	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-23 10:39:18.950529+00
26183f7b-cec2-43df-a180-4c82ff91f48e	d41a6dbf-b002-4b46-ac48-f35492f3814d	\N	2026-01-23 16:10:02.082038+00
a0e31b07-f5c3-4b25-8e7f-e44caae522f8	28c62465-f2c9-4653-adae-0918420f06a3	\N	2026-01-24 02:02:52.438351+00
0cdd6a79-18f2-4281-a350-24ded97fcf43	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	7648394a-dde0-4003-bcae-2277463abdab	2026-01-24 02:08:48.973165+00
85a21f75-6d8d-4a52-ad89-179196dc572e	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	7648394a-dde0-4003-bcae-2277463abdab	2026-01-24 02:08:48.963789+00
6fef252a-e258-427e-b2eb-60915aa08623	d41a6dbf-b002-4b46-ac48-f35492f3814d	c69d726e-a55a-4e43-ac7b-270a4ab83e85	2026-03-25 12:39:17.423827+00
825402e6-7dbe-49ed-b60f-5b300485fe98	28c62465-f2c9-4653-adae-0918420f06a3	7648394a-dde0-4003-bcae-2277463abdab	2026-01-24 02:08:49.017411+00
ffc6b15c-9af3-4d54-b914-0d6ec2bf67e2	5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:31.585597+00
7b6f1570-0b34-4639-aa0f-c53e7491c1ec	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	7648394a-dde0-4003-bcae-2277463abdab	2026-01-24 02:08:49.030486+00
119e5a42-f9a1-4a81-b6e5-be2156bf09fe	e6b29f58-e106-46c6-9eab-a1c2f119493b	7648394a-dde0-4003-bcae-2277463abdab	2026-01-24 02:08:49.034991+00
a30588f8-a55b-4cd3-896e-d78695e7627f	d41a6dbf-b002-4b46-ac48-f35492f3814d	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:31.802613+00
17b96e1b-6fcd-4cb2-aabc-3075ae9592ec	d41a6dbf-b002-4b46-ac48-f35492f3814d	7648394a-dde0-4003-bcae-2277463abdab	2026-01-24 02:08:49.29762+00
5634d0ed-75fa-4949-8e3e-eb0c95e5428d	d41a6dbf-b002-4b46-ac48-f35492f3814d	\N	2026-01-24 02:40:22.650778+00
20f178fc-224e-4ffd-8c75-67f7ae511d9e	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:47:44.405766+00
f300e94b-d452-4677-81ee-e9aadeb6db5f	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:20.386168+00
1c8642b8-7c1d-4f1e-9123-869999e1979e	e6b29f58-e106-46c6-9eab-a1c2f119493b	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:20.599852+00
4cf3cd74-5121-4930-b638-3197f5a33d1e	a6d5ba70-20cf-40ed-a0c4-6c199fafee56	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-06-09 11:24:57.887199+00
93be3e07-8048-403d-aef7-7da8b4527bc4	5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:57.411911+00
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.posts (id, user_id, title, content, category, image_url, product_link, views_count, created_at, updated_at, moderation_status, moderation_note, moderated_by, moderated_at) FROM stdin;
5e72d5f1-3e30-4fc9-8d5e-34754ef12e77	1c1df301-da2b-4ed7-aa41-bf216a66d009	Có bao giờ bà con đồng nghiệp đau đầu vì Xâm Nhập Mặn	Đây là những thứ chúng ta cần phải chia sẻ những kinh nghiệm quý báu để Nông Dân không chịu thiệt hại quá nhiều 👩‍🌾🌾	salinity-solution	\N	\N	150	2026-01-20 06:11:35.429043+00	2026-09-11 16:30:09.140738+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 04:46:09.404688+00
dad214d1-eab3-4cb9-b3a9-45de14b2e778	2175a36f-c2d5-431a-9482-04d3bd25e53f	Giải pháp sử dụng cảm biến đo mặn để chủ động lấy nước tại ĐBSCL	Hiện nay tình trạng xâm nhập mặn tại Đồng bằng Sông Cửu Long ngày càng nghiêm trọng, ảnh hưởng lớn đến sản xuất nông nghiệp. Một giải pháp hiệu quả là sử dụng cảm biến đo độ mặn kết hợp hệ thống cảnh báo.\n\nCách áp dụng:\n\nLắp cảm biến đo độ mặn tại kênh hoặc nguồn nước\nKết nối với điện thoại để theo dõi realtime\nKhi độ mặn dưới ngưỡng (0.5–1‰) thì tiến hành lấy nước vào ruộng\nCó thể kết hợp hệ thống đóng/mở cống tự động\n\nLợi ích:\n\nTránh lấy nước mặn gây thiệt hại mùa vụ\nTiết kiệm chi phí và công sức\nChủ động thích ứng với biến đổi khí hậu\n\nGiải pháp này đặc biệt phù hợp với các tỉnh như Bến Tre, Sóc Trăng, Trà Vinh – nơi chịu ảnh hưởng nặng của xâm nhập mặn.	salinity-solution	\N	\N	10	2026-04-02 11:50:06.079127+00	2026-09-11 16:30:09.202242+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-06-09 15:25:00.361963+00
db776908-452a-4e00-b41b-e45390791fc9	300bd426-4394-4f3d-9691-38c40b380222	Kinh nghiệm gieo cây Ngọt trên đất Mặn	Kinh nghiệm rất quan trọng. Hãy chia sẻ Tips này nhé	experience	\N	\N	1	2026-04-02 11:33:02.97088+00	2026-04-02 11:44:00.328744+00	pending	\N	\N	\N
1ebe1d41-bac7-4807-8c2f-c82ff2512cf6	300bd426-4394-4f3d-9691-38c40b380222	Giải pháp xử lý khi đất thiếu NPK, hãy cùng chia sẻ Phương pháp	Tôi năm nay 50 tuổi. Và suy nghĩ rất nhiều phương pháp và nhận ra rằng .....	salinity-solution	\N	\N	1	2026-04-02 11:34:45.081115+00	2026-04-02 11:44:00.347794+00	pending	\N	\N	\N
5133c21a-fcf7-4021-8bcb-448a3586408d	2374dd2e-e380-45d4-a350-bedbaae40ad0	MƯA ĐỎ TRAILER PHIM HAY	CHÚC THẦY TỨ 247 KKK	experience	\N	\N	1	2026-02-18 05:07:15.528499+00	2026-03-28 02:42:01.335395+00	rejected	Không liên quan đến app	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-03-24 15:08:16.047579+00
0e7f3286-8516-4931-a1e1-32bfd0ca63fe	6c45203b-a5ff-4f1c-be40-6bce6188f757	Các Anh chị chú bác cho tôi hỏi ,ình nên dùng máy tưới tiêu thông dụng hay nên nhập Châu Âu ạ	Xin được giải đáp thắc mắc	product	\N	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	2	2026-04-02 11:45:40.641477+00	2026-09-11 13:44:21.858432+00	pending	\N	\N	\N
c785cfc5-aab2-4027-b788-91ebef1e71b1	2175a36f-c2d5-431a-9482-04d3bd25e53f	Kinh nghiệm xử lý đất nhiễm mặn khi trồng lúa ở Bến Tre	Mình là nông dân ở Bến Tre, đã gặp tình trạng đất bị nhiễm mặn khá nặng vào mùa khô. Sau vài vụ thất bại, mình rút ra một số kinh nghiệm như sau:\n\nKhông lấy nước vào ruộng khi độ mặn trên 1‰ (nên dùng máy đo để kiểm tra trước).\nTận dụng nước mưa để rửa mặn cho đất trước khi xuống giống.\nSử dụng vôi bột (500–700kg/ha) để cải tạo đất.\nChọn giống lúa chịu mặn như OM5451 hoặc ST24.\nCanh thời vụ sớm hơn để tránh đỉnh mặn (thường rơi vào tháng 3–4).\n\nSau khi áp dụng các cách trên, năng suất lúa của mình đã cải thiện rõ rệt, từ 3 tấn/ha lên khoảng 5–5.5 tấn/ha.	experience	\N	\N	1	2026-04-02 11:48:59.532971+00	2026-04-02 11:50:15.824958+00	pending	\N	\N	\N
d41a6dbf-b002-4b46-ac48-f35492f3814d	37f5ce8a-f218-4ec7-87d0-52967b78be4e	Kinh nghiệm xử lý mặn cho cây lúa	Ở vùng bị ngập mặn, lúa có thể bị ảnh hưởng về sinh trưởng. Những nơi có nồng độ muối cao, bị ngập lâu, lúa có thể chết, vì vậy cần có biện pháp xử lý ngăn mặn.\n\nTrước hết, phải ngăn chặn triệt để không cho nước lợ, mặn tiếp tục xâm nhập vào đồng ruộng. Ở những diện tích bị ngập mặn cần phân loại để có biện pháp xử lý thích hợp. Tập trung chăm sóc những diện tích mà cây lúa mới bị ảnh hưởng, điều tiết đủ lượng nước ngọt để rửa mặn nhiều lần; giữ mực nước bằng 2/3 chiều cao cây lúa và nên ngâm tối thiểu 1 ngày, kết hợp làm cỏ xới nhằm xử lý triệt để lượng muối trong nước. Nếu nồng độ muối dưới mức gây hại và cây lúa có biểu hiện phục hồi, ra lá non trở lại thì ngưng tháo nước. Lúc này có thể bón vôi với lượng 30 - 40kg/1.000m2, kết hợp bón thúc nhẹ 4 - 6kg urê hoặc phun các loại phân bón lá để lúa hồi phục nhanh, sinh trưởng thuận lợi. Tuyệt đối không bón nhiều phân, chỉ khi lúa hoàn toàn hồi phục mới áp dụng các biện pháp chăm bón bình thường.\n\nĐối với những diện tích lúa bị chết, nhất thiết phải rửa mặn bằng cách cho nước vào cày bừa và tháo nước ra, kiểm tra thấy an toàn mới gieo trồng lại. Nếu không rửa mặn mà tiếp tục gieo cấy trên diện tích này, cây sẽ chết hoặc sinh trưởng kém vì các độc chất không được xử lý cộng thêm tàn dư cây trồng bị chết thối do nhiễm mặn gây ảnh hưởng lớn tới cây trồng ngay sau đó. Việc nông dân trồng lúa trên nền đất nuôi tôm vừa giúp có thêm thu nhập vừa có lợi cho môi trường nuôi tôm. Tuy nhiên, cần tuân thủ một số biện pháp kỹ thuật để đảm bảo năng suất lúa như: bố trí thời vụ nuôi tôm sao cho thu hoạch xong tôm thì kịp rửa mặn và đảm bảo cho cây lúa trổ bông khi còn nước ngọt. Sau vụ tôm, khi chưa tháo được nước mặn ra thì tuyệt đối không để ruộng bị khô, nứt nẻ vì sẽ làm cho mặn thấm sâu vào tầng đất bên dưới.	experience	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768311487247.jpg	\N	175	2026-01-13 13:38:10.292564+00	2026-09-11 16:30:09.202236+00	approved	\N	\N	\N
e6b29f58-e106-46c6-9eab-a1c2f119493b	e977b62e-005f-4c17-9384-1f9a6283ca02	Giải pháp AI cảnh báo xâm nhập mặn bằng giọng nói cho nông dân khiếm thị Đồng bằng Sông Cửu Long	Biến đổi khí hậu tại Đồng bằng Sông Cửu Long đang ngày càng nghiêm trọng, đặc biệt là xâm nhập mặn, hạn hán và mưa trái mùa.\nTuy nhiên, một nhóm đối tượng thường bị bỏ quên trong các giải pháp công nghệ hiện nay là nông dân khiếm thị, thị lực yếu và nông dân lớn tuổi.\n\n❗ Vấn đề thực tế\n\nPhần lớn ứng dụng dự báo khí hậu hiện nay:\n\nYêu cầu đọc chữ\n\nXem biểu đồ\n\nSử dụng smartphone thành thạo\n→ Nông dân khiếm thị không thể tiếp cận\n\nKhi không nắm được thông tin độ mặn, mưa lũ:\n\nLấy nước sai thời điểm\n\nXuống giống không phù hợp\n\nDẫn đến mất mùa, thiệt hại kinh tế	experience	\N	\N	148	2026-01-21 06:58:24.248343+00	2026-09-11 16:30:09.160077+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 07:03:48.847735+00
a6d5ba70-20cf-40ed-a0c4-6c199fafee56	06558882-7a10-4b69-b8e0-4fef2684a434	KINH NGHIỆM TỪ CHÍNH 20 NĂM LÀM NÔNG TRONG THỜI TIẾT THẤT THƯỜNG , XÂM NHẬP MẶN NGÀY CÀNG TĂNG	Tôi làm nông ở Đồng bằng Sông Cửu Long đã hơn 20 năm. Trước đây, thời tiết còn dễ đoán:\n\nMùa mưa ra mùa mưa\n\nMùa khô ra mùa khô\n\nNhưng vài năm gần đây, biến đổi khí hậu làm mọi thứ thay đổi rất nhanh. Nước mặn vô sớm hơn, mưa thì lúc có lúc không, nhiều khi trở tay không kịp.\n\nSau nhiều lần thất mùa, tôi rút ra được một số kinh nghiệm thực tế muốn chia sẻ lại cho bà con.\n\n🌊 1️⃣ Luôn kiểm tra độ mặn trước khi lấy nước\n\nTrước đây thấy nước ngoài kênh là lấy vô ruộng, giờ thì không dám làm vậy nữa.\nTôi tập thói quen:\n\nĐo độ mặn nước trước khi bơm\n\nNếu mặn trên 4‰ thì tuyệt đối không lấy nước\n\n👉 Nhờ vậy mà tránh được cháy lúa, thối rễ.\n\n🌱 2️⃣ Không bón phân khi đất và nước đang mặn\n\nKhi nước mặn mà bón phân:\n\nCây không hấp thu được\n\nTốn tiền mà còn hại cây\n\nKinh nghiệm của tôi là:\n\nĐợi nước ngọt ổn định\n\nRửa mặn xong mới bón phân\n\nƯu tiên phân giúp phục hồi rễ\n\n🌧️ 3️⃣ Theo dõi thời tiết kỹ hơn, không làm theo thói quen cũ\n\nBiến đổi khí hậu khiến:\n\nMưa có thể đến sớm hoặc trễ\n\nMưa lớn bất thường\n\nTôi học cách:\n\nNghe cảnh báo thời tiết\n\nHỏi thêm cán bộ kỹ thuật\n\nKhông xuống giống theo cảm tính như trước\n\n🧠 4️⃣ Phải chịu khó học thêm cái mới\n\nLúc đầu tôi cũng ngại:\n\nMáy đo\n\nỨng dụng điện thoại\n\nNhưng dùng quen rồi mới thấy:\n\nCó thông tin sớm thì đỡ rủi ro\n\nBiết trước mặn – mưa thì chủ động hơn\n\n👉 Thời buổi này, làm nông không chỉ dựa vào kinh nghiệm cũ, mà phải biết kết hợp với công nghệ.\n\n🌾 LỜI NHẮN GỬI BÀ CON\n\nBiến đổi khí hậu là chuyện không tránh được, nhưng mình có thể giảm thiệt hại nếu biết chuẩn bị trước.\nMong bà con cùng chia sẻ thêm kinh nghiệm để cùng nhau làm nông bền vững và đỡ vất vả hơn	experience	\N	\N	147	2026-01-21 07:26:32.97535+00	2026-09-11 16:30:09.483527+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 07:49:26.316713+00
5f26aa3f-7fb4-48ae-b0aa-eb98b56703ce	e977b62e-005f-4c17-9384-1f9a6283ca02	BỘ SẢN PHẨM& THIẾT BỊ NÀO GIÚP TÔI CÓ MỘT MÙA NÔNG VỤ THÀNH CÔNG	Xâm nhập mặn ngày càng ảnh hưởng nặng đến sản xuất nông nghiệp tại Đồng bằng Sông Cửu Long. Để hạn chế thiệt hại, nông dân nên sử dụng đúng phân bón và kiểm tra độ mặn nước trước khi tưới.\n\n🌱 Phân bón cho vùng đất mặn\n\nGiúp cây tăng sức chịu mặn\n\nPhục hồi rễ, giảm vàng lá\n\nKhông bón khi độ mặn nước trên 4‰\n\n💧 Máy đo độ mặn cầm tay\n\nĐo nhanh nước sông, kênh, ao\n\nCách dùng đơn giản:\n\nBật máy\n\nNhúng đầu đo vào nước\n\nĐọc kết quả sau vài giây\n\nCách đọc chỉ số:\n\n< 1‰: Lấy nước an toàn\n\n1–3‰: Cẩn thận\n\n4‰: Không nên lấy nước\n\nKết hợp sản phẩm + ứng dụng cảnh báo xâm nhập mặn sẽ giúp nông dân chủ động hơn, giảm rủi ro do biến đổi khí hậu.	product	\N	37360082-90e8-43d8-b7db-de1c569476f7	148	2026-01-21 07:12:55.133234+00	2026-09-11 16:30:09.488984+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 07:14:41.220579+00
28c62465-f2c9-4653-adae-0918420f06a3	6c45203b-a5ff-4f1c-be40-6bce6188f757	NHÓM EM/CON/CHÁU HY VỌNG SẼ GIÚP BÀ CON NÔNG DÂN NHẤT Ở YDCC DỊP CẬN TẾT NÀY	- DỰ BÁO XU HƯỚNG XÂM NHẬP MẶN\n- HỖ TRỢ GIẢI QUYẾT VẤN ĐỀ VỐN CHO BÀ CON QUA LIÊN KẾT NGÂN HÀNG, DOANH NGHIỆP CUNG CẤP NÔNG PHẨM.\n- ĐẶT QUYỀN LỢI BÀ CON NÔNG DÂN CHÚNG TA LÊN HÀNG ĐẦU Ạ THÔNG QUA BẢO HIỂM NÔNG NGHIỆP.\n\n-----------------NO PAIN - NO GAIN----------------\n--------------LET'S-TRUST-GREENHACKERS--------	experience	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/post-images/6c45203b-a5ff-4f1c-be40-6bce6188f757/1768546674392.jpg	\N	173	2026-01-16 06:57:58.601612+00	2026-09-11 16:30:09.146046+00	approved	\N	\N	\N
\.


--
-- Data for Name: pricing_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pricing_rules (id, business_id, customer_id, product_id, discount_percentage, fixed_discount, special_price, credit_term_days, interest_rate, valid_from, valid_until, is_active, priority, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_images (id, product_id, image_url, display_order, is_primary, created_at) FROM stdin;
8a393dbf-73d5-422a-b8ad-a1cb38c25c56	5678d71b-ef27-482b-a2a0-08be5ca48451	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/6c45203b-a5ff-4f1c-be40-6bce6188f757/1769304627334-8tgm0m.jpg	0	t	2026-01-25 01:30:31.336051+00
878c5145-3b98-47e2-8fb8-a9ccf308e286	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/6c45203b-a5ff-4f1c-be40-6bce6188f757/1769304916617-i21y2as.jpg	0	t	2026-01-25 01:35:20.473113+00
e216fac4-7989-4796-9d10-5e4ef58167f9	8ef76374-c486-4e2d-811a-0b82ad202333	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/e65ce75b-fdd6-4b2b-b6c8-c189c5030404/1769312790712-lc8mwk.jpg	0	t	2026-01-25 03:46:34.188959+00
0bee8185-fec9-4fe2-9e62-b443f63a249b	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/4e9dd36c-38f2-4353-a320-0c31fa3cc970/1774434933155-5ofmx.jpg	0	t	2026-03-25 10:35:34.040072+00
0fde4d9b-acb3-4463-b23e-5b65f803eb4c	d0f67bde-29c5-40e2-8e5c-fe337e6fc934	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/300bd426-4394-4f3d-9691-38c40b380222/1775129855688-lyhq8.jpg	0	t	2026-04-02 11:37:45.033917+00
afef4209-51ff-468f-bb13-d4b04c6e0683	4345c971-4cde-4676-891e-7fc66676b34b	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/300bd426-4394-4f3d-9691-38c40b380222/1775130012243-xpfkl8.jpg	0	t	2026-04-02 11:40:19.096795+00
ea18c249-6971-4853-8208-8a01058a5677	c1396478-b36b-455a-a850-f782c2817dbb	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/2175a36f-c2d5-431a-9482-04d3bd25e53f/1775130332409-zsk7b.jpeg	0	t	2026-04-02 11:45:33.966795+00
d577a53d-0d9e-44c2-ba4f-ebcec2e1840f	3e974016-6e14-4d54-959c-87aebb8f3892	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/2175a36f-c2d5-431a-9482-04d3bd25e53f/1775130441888-z147fm.webp	0	t	2026-04-02 11:47:23.608541+00
f74c1f1d-aca5-44da-b66a-c8fc2651980d	d3f1f0ec-b655-40be-8960-75d309a66173	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/6c45203b-a5ff-4f1c-be40-6bce6188f757/1775130438642-ijj1xr.jpg	0	t	2026-04-02 11:47:24.816883+00
\.


--
-- Data for Name: product_videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_videos (id, product_id, video_url, thumbnail_url, duration, file_size, created_at) FROM stdin;
\.


--
-- Data for Name: product_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_views (id, product_id, user_id, viewed_at) FROM stdin;
7e459801-7ce6-405c-b84d-449fbf586cd9	37360082-90e8-43d8-b7db-de1c569476f7	4ee915ec-4c50-4adf-9650-ea4ee740210f	2026-01-24 03:26:01.988755+00
26a3358b-3699-4d84-aa3e-4755cc434508	37360082-90e8-43d8-b7db-de1c569476f7	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-03 17:42:35.615524+00
6a6e4fad-f564-490e-858d-9cb63766c4f5	37360082-90e8-43d8-b7db-de1c569476f7	b1294c8d-cc65-480c-92ff-0e23cd927b59	2026-01-04 15:48:01.411418+00
c7f1edab-8c1d-4d5c-80f7-9e7f00c81721	37360082-90e8-43d8-b7db-de1c569476f7	02f10e79-87fe-4842-8790-97976769f4fa	2026-01-11 15:13:49.420263+00
125c1877-298b-44a9-a731-7a1af6da370d	37360082-90e8-43d8-b7db-de1c569476f7	ca24214f-9f3f-40f2-8c59-900f3124c5c8	2026-01-24 04:25:00.685179+00
d9602236-db6c-469f-8410-6db934ff7f1f	37360082-90e8-43d8-b7db-de1c569476f7	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-16 06:33:13.117414+00
89771c08-1312-4640-9586-21e6544d3bcf	37360082-90e8-43d8-b7db-de1c569476f7	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-01-16 06:39:09.317119+00
e7d55701-ec6f-4232-b8c7-a34c72a6520f	37360082-90e8-43d8-b7db-de1c569476f7	71db8ee9-f2ce-4548-bf96-dc4dea252445	2026-01-16 06:52:54.285462+00
b6f7a015-da94-44a4-8c93-526a639ec867	37360082-90e8-43d8-b7db-de1c569476f7	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-16 06:59:53.651468+00
a3022a7c-d1bd-4f90-98a5-b701aabd346d	37360082-90e8-43d8-b7db-de1c569476f7	1993de5f-2df4-4232-bdaf-96681211700f	2026-01-16 15:34:31.955904+00
13fd4693-5657-4086-be51-07dac81c6a7a	37360082-90e8-43d8-b7db-de1c569476f7	dd5e2f80-2fb3-45ac-9e38-b7a054f820cd	2026-01-17 09:54:17.400501+00
9f5962e1-d7de-4f22-8ade-46287151ab07	37360082-90e8-43d8-b7db-de1c569476f7	11c5a34a-a000-45e4-a301-09a98be93ba0	2026-01-17 11:26:01.14419+00
6d7a8260-4e30-4240-ada6-aa1209e3dc07	37360082-90e8-43d8-b7db-de1c569476f7	344b49b7-2784-4453-8732-b03ad4a571bf	2026-01-17 16:44:04.037753+00
9f0debd2-ffea-4a0e-aaef-ad5344c69d05	37360082-90e8-43d8-b7db-de1c569476f7	b84557f5-40ad-4376-8d50-cdf78aac9c07	2026-01-17 16:52:11.134969+00
3988c6ab-19af-4368-9025-246c7bc9b19f	37360082-90e8-43d8-b7db-de1c569476f7	76fb9807-6735-478f-a363-79fb2a20be7f	2026-01-17 17:11:39.905477+00
44c6920f-e63a-48c6-b838-ba3a689da278	5678d71b-ef27-482b-a2a0-08be5ca48451	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-25 01:37:05.613958+00
516e96e1-0e5d-489f-a91e-86d6d4c947ad	37360082-90e8-43d8-b7db-de1c569476f7	d7b8b6cd-75cf-4324-b3ce-975a95849477	2026-01-17 17:34:35.365993+00
d6ddfc22-167c-40b9-91e7-c807200c527a	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-25 01:37:05.625758+00
cd3e0878-f738-4d25-ab1d-3492a6d07e69	5678d71b-ef27-482b-a2a0-08be5ca48451	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-25 02:23:01.780879+00
9ef3cb51-ae76-43f7-8aee-613657a0db7b	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-25 02:23:01.780624+00
bb73800b-835b-4a9b-89cd-7345928c996e	8ef76374-c486-4e2d-811a-0b82ad202333	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-25 03:48:16.26281+00
5204a25f-8faa-421b-b641-9dd37c4052ae	8ef76374-c486-4e2d-811a-0b82ad202333	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-25 03:48:48.399164+00
dbf4b9fd-0a34-4dd0-8333-939c19e78040	8ef76374-c486-4e2d-811a-0b82ad202333	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-25 03:58:09.182158+00
e6317c6d-f50b-4984-a513-90d2184924c0	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-25 03:58:09.197686+00
91c61524-ddb4-4625-8313-7314a4300c7d	5678d71b-ef27-482b-a2a0-08be5ca48451	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-25 03:58:09.213486+00
bcbc0081-08fb-4e8e-9cce-fa29f8f32a88	37360082-90e8-43d8-b7db-de1c569476f7	9251db17-0835-41c7-8469-28dee88096b1	2026-01-18 11:39:03.636325+00
68498e5f-c11e-4575-a2f1-eae1d3ef0d23	37360082-90e8-43d8-b7db-de1c569476f7	5d100834-5494-4217-ac7c-e02053c4f016	2026-01-25 03:58:09.498887+00
f189a3bd-d6a4-44d5-a212-f64e641d7cb0	8ef76374-c486-4e2d-811a-0b82ad202333	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:37:35.222996+00
4dad1f4b-85e7-445e-bd29-946a9c38962d	37360082-90e8-43d8-b7db-de1c569476f7	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-19 16:09:58.770905+00
27ece88f-c76a-4fc1-ad95-e5e60d06b260	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:37:35.228379+00
e967b956-f5b2-4b65-a477-7fc794d3bba3	37360082-90e8-43d8-b7db-de1c569476f7	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:37:35.224989+00
fba79ea8-7710-47f9-82c6-60053046ff7a	5678d71b-ef27-482b-a2a0-08be5ca48451	e30a9483-72fc-424d-9617-0e5e040ce685	2026-01-25 06:37:35.222242+00
7e6dcdd1-6ca2-432c-83d9-383575dc7e97	37360082-90e8-43d8-b7db-de1c569476f7	d4e15dfe-84c9-489a-997f-4303eb9de453	2026-01-21 06:41:39.86011+00
83d243f2-b7ed-4a1a-9b3f-47e63bd00f43	8ef76374-c486-4e2d-811a-0b82ad202333	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:12.505344+00
f130fad8-2fd0-477b-8573-489bc3de92da	37360082-90e8-43d8-b7db-de1c569476f7	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:12.507002+00
da5bb40c-689c-4bbd-beb3-655482e696c4	5678d71b-ef27-482b-a2a0-08be5ca48451	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:12.521236+00
f580f495-3725-4b65-b9a0-1d3656f5dd28	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	2026-01-26 15:51:12.533556+00
9aed6a9a-c743-486a-820d-9a49a6b47f81	37360082-90e8-43d8-b7db-de1c569476f7	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21 07:18:43.578409+00
a1d1aec3-00ec-4c33-b140-26e2dfe664ec	8ef76374-c486-4e2d-811a-0b82ad202333	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-02-16 09:56:19.931352+00
ef77487e-ff3b-411b-aae6-e49f78bb02d7	8ef76374-c486-4e2d-811a-0b82ad202333	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 04:46:21.620408+00
3c53f417-63fb-4cb8-9279-50e44ef7c224	37360082-90e8-43d8-b7db-de1c569476f7	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21 07:55:16.236155+00
e93a5a9b-4d04-4914-8542-e676979e4703	37360082-90e8-43d8-b7db-de1c569476f7	48e0eab7-7b01-4df7-a7d7-e0a568853c4d	2026-01-21 09:02:46.834201+00
9b890ebd-04f7-4306-a46b-40d52e3cf2ba	5678d71b-ef27-482b-a2a0-08be5ca48451	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 04:46:21.613426+00
5b28e250-8eb2-4125-91a9-80aab71255c2	37360082-90e8-43d8-b7db-de1c569476f7	a359520f-7b6e-4aff-9265-bb33afa669f5	2026-01-21 09:13:59.899498+00
095b1a0d-7992-493f-abe5-db7f97027dbb	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 04:46:21.828267+00
e3655295-ca7b-41f5-a64e-c7103b8e638a	37360082-90e8-43d8-b7db-de1c569476f7	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18 04:46:21.827464+00
13c05ad7-8e7d-4129-8131-b5180967223b	37360082-90e8-43d8-b7db-de1c569476f7	e66c8ff2-f269-4bf0-8d22-58731ba77517	2026-01-21 09:28:57.546409+00
e6393159-6430-4352-8583-b7a9f2a716ff	37360082-90e8-43d8-b7db-de1c569476f7	1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	2026-01-21 09:33:07.085422+00
49a10a65-40b8-4ecd-820d-51f8bf86c1ec	8ef76374-c486-4e2d-811a-0b82ad202333	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:02.398366+00
d7597575-4703-41a4-9625-9240342e4bf0	37360082-90e8-43d8-b7db-de1c569476f7	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:02.421395+00
964a6422-9524-4ab2-8a0e-f45af2d48854	37360082-90e8-43d8-b7db-de1c569476f7	97d42fa7-76a1-41f1-bedc-90ee426c32bf	2026-01-21 10:24:13.2531+00
77f3e283-7dbc-480f-a4cf-73b512fe5ed2	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:02.437004+00
d45d972d-5e7f-4031-acbf-6d0d01c1c298	5678d71b-ef27-482b-a2a0-08be5ca48451	55cc2f62-282e-455d-8d90-675dae449f45	2026-03-13 14:20:02.439225+00
1f7d092a-b9f7-49e5-82da-48cd57002a52	37360082-90e8-43d8-b7db-de1c569476f7	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:57:11.677613+00
7d6d8f8a-4164-40c3-8845-d093d3b311e5	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:57:11.652921+00
0f56950a-1891-4f17-b535-1206f8c160bd	5678d71b-ef27-482b-a2a0-08be5ca48451	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:57:11.657589+00
147d6503-e93a-4e85-b41a-42f6de3b071d	37360082-90e8-43d8-b7db-de1c569476f7	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	2026-01-21 11:00:33.576971+00
c7263846-cf39-4277-91c8-ff90af3398bb	8ef76374-c486-4e2d-811a-0b82ad202333	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-24 14:57:11.661646+00
ffc2f010-5473-4ab5-af33-94b02a0df4e3	8ef76374-c486-4e2d-811a-0b82ad202333	9d0ef483-3495-446e-a744-f290c1e4d509	2026-03-25 10:45:25.037207+00
58f792be-8f64-497a-8458-c73ab6c6bb88	5678d71b-ef27-482b-a2a0-08be5ca48451	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:21:32.756072+00
f97213d8-94b8-4cf7-8882-d2711891f373	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:21:32.748742+00
453135c1-236f-49cc-b904-184bf95c2dad	37360082-90e8-43d8-b7db-de1c569476f7	529cb4b3-5936-4705-be79-f332013e0beb	2026-01-22 00:42:51.800949+00
52c4a7b6-a753-4b3b-b356-c862740072d3	8ef76374-c486-4e2d-811a-0b82ad202333	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:21:32.791244+00
69a0baf9-a77b-498d-ac55-6b0772a3edce	37360082-90e8-43d8-b7db-de1c569476f7	beee8c36-1731-4a54-92b0-b43e09870208	2026-03-25 12:21:32.799936+00
0e6060b4-7220-41d9-8cc4-88c431093ee2	37360082-90e8-43d8-b7db-de1c569476f7	17bdad1d-532c-4a07-9936-669d62c8ef04	2026-01-22 18:58:15.101721+00
f5c09deb-fb6b-4723-a71a-ae058925b997	8ef76374-c486-4e2d-811a-0b82ad202333	c69d726e-a55a-4e43-ac7b-270a4ab83e85	2026-03-25 12:39:19.899398+00
7d0d0e7c-3295-495c-974c-9797bdb8fd0a	8ef76374-c486-4e2d-811a-0b82ad202333	\N	2026-03-25 12:50:26.79904+00
722a9b08-b162-49aa-a813-c2d2ccc06c06	37360082-90e8-43d8-b7db-de1c569476f7	5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	2026-01-23 09:36:27.222918+00
079e2479-94f4-4ba8-ab7f-46a544feba88	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	\N	2026-03-25 12:50:26.816659+00
e48f66aa-9054-4134-b856-c25fdf091967	37360082-90e8-43d8-b7db-de1c569476f7	\N	2026-03-25 12:50:26.854949+00
619e4dc4-6dce-40f0-bff9-ce52a2ae884e	5678d71b-ef27-482b-a2a0-08be5ca48451	\N	2026-03-25 12:50:26.878822+00
6d0eac7c-3526-4908-b26f-b90c61f7319b	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-03-28 02:46:21.753824+00
1475b9f8-90ab-453f-9ded-a07f4789e8c7	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-03-28 02:51:41.524733+00
9a8aa891-2c33-4995-9ac7-979ea892cd63	37360082-90e8-43d8-b7db-de1c569476f7	7648394a-dde0-4003-bcae-2277463abdab	2026-01-24 02:09:02.24369+00
930d397b-0032-42a3-be82-7cac3126ead4	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:02:58.176737+00
85db13df-d8a9-4d96-b6dd-8af681332c37	37360082-90e8-43d8-b7db-de1c569476f7	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:02:58.159556+00
df91f814-e43f-42f3-b2f2-fa6c06c1c6cd	5678d71b-ef27-482b-a2a0-08be5ca48451	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:02:58.165388+00
2b764b1c-b3c5-4af8-a541-b4e7769d0133	8ef76374-c486-4e2d-811a-0b82ad202333	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:02:58.160697+00
a10438ad-fd98-4b59-966e-1827a99aa6f8	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	2026-03-30 10:02:58.15832+00
f5ace235-f49d-4be1-8dee-f4910770c34c	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:07:24.373345+00
59b9fd50-e673-4f3c-9724-f7ae835058a2	8ef76374-c486-4e2d-811a-0b82ad202333	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:07:24.376593+00
cd18c3db-203d-4eac-9ff5-0c625eafb98d	5678d71b-ef27-482b-a2a0-08be5ca48451	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:07:24.386775+00
fb3dd871-63d2-4082-aaa6-54340438a7da	37360082-90e8-43d8-b7db-de1c569476f7	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:07:24.38807+00
2ad77087-d086-4af6-8e4e-c1d6f9451bfb	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	16da4e53-c6ee-427a-9944-3794eaa52a05	2026-03-30 10:07:24.391228+00
681ba6ba-e429-4f0f-a55e-b461f373eb49	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:39.49132+00
64228700-5b05-4d84-bd5a-b3fccd50f7a9	5678d71b-ef27-482b-a2a0-08be5ca48451	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:39.498696+00
5100c1cf-7fb5-41e2-94c1-be5687f6ceaf	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:39.553152+00
9a643b3e-170f-4fcc-8919-e338921e44e7	37360082-90e8-43d8-b7db-de1c569476f7	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:39.605068+00
32aca6db-ed8b-403f-a8f4-2579379862ca	8ef76374-c486-4e2d-811a-0b82ad202333	e5cbc967-ea15-403a-829a-5f669791739f	2026-04-02 10:34:39.609069+00
2a3376e7-143e-49c3-9178-9ce9ec2efaf4	8ef76374-c486-4e2d-811a-0b82ad202333	51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	2026-04-02 11:15:01.516013+00
5c642970-e639-4b76-a7e8-40b977ac2734	8ef76374-c486-4e2d-811a-0b82ad202333	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:31:19.34911+00
c1fd3893-adc2-4f2c-832c-cc01cc6789ad	37360082-90e8-43d8-b7db-de1c569476f7	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:31:19.355845+00
3c23e621-3268-45b5-a5bb-291afe71ba4d	5678d71b-ef27-482b-a2a0-08be5ca48451	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:31:19.356256+00
3ff91726-94ac-407a-8e6c-c3c3d0d339c4	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:31:19.339728+00
4e303440-4cb2-4c24-bff2-234df63b2a90	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02 11:31:19.63674+00
513dfd98-8cb1-4e31-93d4-2c466a366c5e	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:34:48.407435+00
c724a833-5833-473f-888f-393ba1099b3d	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:34:48.482467+00
220764a8-445c-4820-a916-59865957ef63	5678d71b-ef27-482b-a2a0-08be5ca48451	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:34:48.487081+00
4eff5a36-ca8e-443c-bd2c-14ddbb4d9227	8ef76374-c486-4e2d-811a-0b82ad202333	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:34:48.499594+00
de92faa0-bbde-4dee-8af5-c7e05e9fefcc	37360082-90e8-43d8-b7db-de1c569476f7	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02 11:34:48.475098+00
69a51239-5e2b-4f0f-b2f1-2881b5742088	37360082-90e8-43d8-b7db-de1c569476f7	bb8f9a70-be4a-4126-ba4b-e2c1752aa465	2026-04-02 12:03:57.668401+00
a8b976d0-2c3a-4af3-86e9-23eb6d4cc624	8ef76374-c486-4e2d-811a-0b82ad202333	bb8f9a70-be4a-4126-ba4b-e2c1752aa465	2026-04-02 12:03:57.673705+00
6c9e5861-e147-4e6c-85eb-5cae42d6614f	5678d71b-ef27-482b-a2a0-08be5ca48451	bb8f9a70-be4a-4126-ba4b-e2c1752aa465	2026-04-02 12:03:57.671344+00
c655bd96-2680-4945-acb2-a21b241952b3	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	bb8f9a70-be4a-4126-ba4b-e2c1752aa465	2026-04-02 12:03:57.662695+00
010dd8a5-255d-4572-a158-b02774ebf823	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	bb8f9a70-be4a-4126-ba4b-e2c1752aa465	2026-04-02 12:03:57.694242+00
d2739ed3-593c-4924-9116-32e288c3249c	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	fe5c2b78-e465-4b92-8adc-bed5ad2fed48	2026-04-04 14:05:25.715726+00
7344f792-750f-49d4-9b6b-2320c690c2d9	5678d71b-ef27-482b-a2a0-08be5ca48451	fe5c2b78-e465-4b92-8adc-bed5ad2fed48	2026-04-04 14:05:25.730562+00
bbd74c9a-bc12-4bc3-9954-4646cfdaba1c	37360082-90e8-43d8-b7db-de1c569476f7	fe5c2b78-e465-4b92-8adc-bed5ad2fed48	2026-04-04 14:05:25.69472+00
794a553b-9f3f-4df9-a062-feb3be4dbe91	8ef76374-c486-4e2d-811a-0b82ad202333	fe5c2b78-e465-4b92-8adc-bed5ad2fed48	2026-04-04 14:05:25.960628+00
aca9c542-3ec1-432c-a1a8-6ac3baef0dcd	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	fe5c2b78-e465-4b92-8adc-bed5ad2fed48	2026-04-04 14:05:25.978745+00
14edf012-492e-4871-968a-fe165e46b316	8ef76374-c486-4e2d-811a-0b82ad202333	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:09:52.135112+00
a8b246f7-35b0-430f-a80d-0396b7b396f9	37360082-90e8-43d8-b7db-de1c569476f7	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:09:52.141493+00
336ae02f-c66f-4c7d-8d3b-49d7e882a881	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:09:52.137907+00
a4c7bb03-287f-4b62-9209-417c6efc46a3	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:09:52.140445+00
ddf64fa6-d792-428a-8534-53db7a146028	5678d71b-ef27-482b-a2a0-08be5ca48451	660e5db2-b63a-4a80-9e03-61b9676a25f0	2026-04-04 14:09:52.142068+00
397eb5f7-374c-4ae3-a8da-0a81db1db0fc	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-04-05 09:05:24.440953+00
c808eec9-f898-49b0-ab22-1dbccf3273ca	37360082-90e8-43d8-b7db-de1c569476f7	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:41.486474+00
f27f48c4-5d30-4112-84aa-e42eb274b383	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:41.685743+00
3956af0a-b553-470f-93bf-ab559f7d8144	8ef76374-c486-4e2d-811a-0b82ad202333	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:41.832803+00
d8325199-d03c-4f5b-9582-ca061a522bbc	5678d71b-ef27-482b-a2a0-08be5ca48451	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:41.836647+00
680962cf-fb4b-4de8-bf0b-057505f38c7a	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	261a6c39-6bc6-4b53-bad9-d8a71b56de92	2026-04-07 03:18:41.838739+00
9a34af65-4d0c-40b0-bddb-c84e0a2ceb2e	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:20.426496+00
d888b3d9-8a90-4de7-9341-801883a50fd9	5678d71b-ef27-482b-a2a0-08be5ca48451	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:20.426626+00
204b2f11-0492-4563-9233-bc9e2c974d5e	37360082-90e8-43d8-b7db-de1c569476f7	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:20.430518+00
79abe186-5542-4aab-b738-41f091fbba65	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:20.428719+00
66bbe1e0-eca3-44da-89c7-549f8f768508	8ef76374-c486-4e2d-811a-0b82ad202333	0da7a857-7581-4bb4-8fbb-b0bc39d997a7	2026-04-11 20:18:20.425182+00
84323ced-1126-4f9d-b8ba-7ad85a82e931	37360082-90e8-43d8-b7db-de1c569476f7	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 02:59:03.20276+00
77d29840-8672-4223-88eb-9109ba6ae3d1	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 02:59:03.227485+00
ecefa5f0-ed84-47eb-9c72-737a76ea4569	5678d71b-ef27-482b-a2a0-08be5ca48451	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 02:59:03.204669+00
ad288878-5dbf-434e-9128-b21f21754e73	8ef76374-c486-4e2d-811a-0b82ad202333	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 02:59:03.202246+00
c94e52fd-b35a-4649-9205-73e8c100634c	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	2ce59d73-d507-4df2-8254-b780773e6465	2026-05-12 02:59:03.255019+00
b8aeb70a-0524-473c-b8d4-11986d21578a	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	5d100834-5494-4217-ac7c-e02053c4f016	2026-05-27 13:38:15.506951+00
64e9eb1a-8165-4d61-a0f9-1718805aa0cf	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:36:52.710387+00
9e4a2a7c-6d8f-4aa0-b8df-7097a636eca1	8ef76374-c486-4e2d-811a-0b82ad202333	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:36:52.723532+00
873d040a-982a-4c15-a80a-072f0332c865	5678d71b-ef27-482b-a2a0-08be5ca48451	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:36:52.707654+00
eab9c675-5ca2-4576-851e-a6f54a78a2ba	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:36:52.720381+00
e2404811-82c9-48df-9df7-8e219f43cffc	37360082-90e8-43d8-b7db-de1c569476f7	287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	2026-06-09 10:36:52.749946+00
f5501168-269a-4c87-9fb0-f4114a957823	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-06-09 11:24:50.017527+00
b633749e-e961-4bb2-8696-1caae246cb63	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-06-09 11:24:50.312206+00
54f8208f-cdc0-4f7a-b589-e72d5daa44bd	5678d71b-ef27-482b-a2a0-08be5ca48451	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-06-09 11:24:50.315617+00
90257164-c39a-43f1-bdad-2ae8c9bdb247	8ef76374-c486-4e2d-811a-0b82ad202333	00cbea4e-de0d-4a84-bdb2-994e70fe08bf	2026-06-09 11:24:50.311956+00
382da82e-b4b0-4b8c-8f62-3ba548ca58c9	37360082-90e8-43d8-b7db-de1c569476f7	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-09 15:23:16.199344+00
b1557476-fd27-410d-b80f-a69e60c8beed	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-09 15:23:16.18939+00
e50a0ad8-4efb-4a36-9c64-b23d6afe0578	8ef76374-c486-4e2d-811a-0b82ad202333	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-09 15:23:16.2029+00
20dfc2a1-f527-40ab-bae7-f39eae11d6c5	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-09 15:23:16.202758+00
5b60e978-f21b-4fe2-9b80-ddb87b1f2f8f	5678d71b-ef27-482b-a2a0-08be5ca48451	ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	2026-06-09 15:23:16.198364+00
31f53efa-93ec-4375-98c1-a41da21a1398	8ef76374-c486-4e2d-811a-0b82ad202333	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:34:12.129534+00
7415fd6d-201b-40d7-a40f-1d9e3aeda828	5678d71b-ef27-482b-a2a0-08be5ca48451	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:34:12.130809+00
00d055f7-e8d4-46f5-ba27-6065e5a0dd27	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:34:12.125384+00
e251e7c1-e19a-47ae-9aa7-cdda12305fa6	37360082-90e8-43d8-b7db-de1c569476f7	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:34:12.162735+00
20774b0a-3e55-448b-9759-5d1a315f57ea	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	20585b2e-27e7-42c3-87bb-3ddebb856a7d	2026-08-07 13:34:12.171822+00
f9cc1f18-6a21-4e75-9172-68775f064031	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:58:29.964478+00
a16c0113-a33e-4f12-ae43-6de95f4e1e9b	37360082-90e8-43d8-b7db-de1c569476f7	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:58:29.97045+00
3362a218-75dd-40ce-a0f6-afe9d277ca05	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:58:29.951891+00
6ddba273-328a-4d7d-996d-7c40c14ff7e1	8ef76374-c486-4e2d-811a-0b82ad202333	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:58:29.936078+00
cd198ace-fccb-4825-9956-26cca7f9ce5e	5678d71b-ef27-482b-a2a0-08be5ca48451	ef593d11-dafa-4203-8b38-217cb6ece842	2026-08-31 06:58:29.998377+00
e29d8862-bc59-47f5-a6b3-b735771ca568	8ef76374-c486-4e2d-811a-0b82ad202333	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:34.8835+00
31c95c30-e69b-4fcf-b4d3-3ea64d3bd86c	5678d71b-ef27-482b-a2a0-08be5ca48451	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:35.198732+00
4242d744-7b02-47d2-ba40-0d1655ec9006	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:35.198961+00
07be413c-dc2f-49fa-ab4d-0ceeb0c4c1dd	37360082-90e8-43d8-b7db-de1c569476f7	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:35.563541+00
97497501-bc8a-431f-a2a3-324fc45c60c5	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	82701dce-0653-45d3-a690-cac5207d5439	2026-09-02 15:56:35.202119+00
79839b5a-da0c-4ed5-85ad-a232f6c480b0	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	8566b0fd-1c92-4f5e-b468-a0b74bfab795	2026-09-02 21:12:57.817223+00
23b7a7b3-8a05-4562-b844-665d1e3250f2	5678d71b-ef27-482b-a2a0-08be5ca48451	8566b0fd-1c92-4f5e-b468-a0b74bfab795	2026-09-02 21:12:57.855995+00
c37bead7-df4c-40b3-95bb-9e10efebf7d2	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	8566b0fd-1c92-4f5e-b468-a0b74bfab795	2026-09-02 21:12:57.864805+00
38d7d9bf-d19f-4511-813b-8f771b172cca	37360082-90e8-43d8-b7db-de1c569476f7	8566b0fd-1c92-4f5e-b468-a0b74bfab795	2026-09-02 21:12:58.233879+00
12484df0-b66b-43a8-a05c-feaa5eda8f83	8ef76374-c486-4e2d-811a-0b82ad202333	8566b0fd-1c92-4f5e-b468-a0b74bfab795	2026-09-02 21:12:58.235565+00
d5bb5ca8-49d6-4dca-957f-80530db7e284	5678d71b-ef27-482b-a2a0-08be5ca48451	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-03 13:03:35.004156+00
8b2a1bc9-f49b-44a3-8663-93919756eac0	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-03 13:03:35.018119+00
013e8b37-375c-4db6-8cdf-255e90f69b6b	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-03 13:03:35.018359+00
6789d76e-9d4f-4748-b9aa-d2c14806b62c	8ef76374-c486-4e2d-811a-0b82ad202333	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-03 13:03:35.028951+00
f9aa0a7a-3a64-41d1-8d39-6bbdb9d1d8e8	37360082-90e8-43d8-b7db-de1c569476f7	8e5489ab-5339-4864-aa29-845a32684bdf	2026-09-03 13:03:35.053703+00
c95a4d3f-89a3-4d5c-a340-ec424bb47b77	8ef76374-c486-4e2d-811a-0b82ad202333	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 12:18:38.719607+00
34df3129-7b8e-43ba-a7f9-1bed9b62e42f	c0330ce4-892b-41e8-9eab-a0c4f7d638c3	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 12:18:38.724608+00
a334c0fc-b185-4a40-aac2-4250832f1bb1	5678d71b-ef27-482b-a2a0-08be5ca48451	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 12:18:38.738532+00
edda296f-7c30-4599-ba94-e734bf1e021b	37360082-90e8-43d8-b7db-de1c569476f7	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 12:18:38.738583+00
ac75bfd0-11f3-4d9b-af60-d549d6925929	0949dd4a-c774-4a2c-8098-68b2c9fcf74b	615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	2026-09-08 12:18:38.750375+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, user_id, name, description, price, category, image_url, contact, views_count, created_at, updated_at, moderation_status, moderation_note, moderated_by, moderated_at) FROM stdin;
98d04bf2-41e7-417e-a34a-09af4a17fec7	2374dd2e-e380-45d4-a350-bedbaae40ad0	PKL	JAV	12343234.00	Giống cây trồng	\N	00000898676	0	2026-03-24 14:48:30.278077+00	2026-03-24 15:07:54.013911+00	rejected	Sản phẩm chỉ mang tính chất tào lao 	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-03-24 15:07:54.013911+00
5678d71b-ef27-482b-a2a0-08be5ca48451	6c45203b-a5ff-4f1c-be40-6bce6188f757	Máy đo độ mặn cầm tay HI9835 chuẩn Châu Âu	📌HI9835 là máy đo đa chỉ tiêu cầm tay chuyên nghiệp có thể đo:\n\nĐộ mặn (salinity)\n\nĐộ dẫn điện (EC)\n\n📏 Đặc điểm nổi bật\n✅ Thiết kế chuẩn Châu Âu\n\nSản phẩm của Hanna Instruments — hãng kiểm tra và đo lường khoa học nổi tiếng với tiêu chuẩn chất lượng châu Âu.\n\nVỏ máy bền, chống va đập và phù hợp với ứng dụng ngoài thực địa.\n\n🖥 Đầu đọc đa chỉ tiêu\n\nMàn hình hiển thị số rõ ràng, hiện cùng lúc các giá trị: EC, TDS, độ mặn và nhiệt độ.\n\nTổng chất rắn hòa tan (TDS)\n\nNhiệt độ\n\n	18999000.00	Thiết bị đo	\N	0585708372	30	2026-01-25 01:30:29.305771+00	2026-09-11 16:30:25.337682+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-25 01:35:50.893251+00
0949dd4a-c774-4a2c-8098-68b2c9fcf74b	4e9dd36c-38f2-4353-a320-0c31fa3cc970	Đầu phun nước tưới	Là thiết bị kết nối với hệ thống tưới tiêu giúp phân tán nước phủ đều xung quanh	650000.00	Hệ thống tưới	\N	0819447753	24	2026-03-25 10:35:32.251769+00	2026-09-11 16:30:25.285878+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-03-28 02:45:28.083846+00
d0f67bde-29c5-40e2-8e5c-fe337e6fc934	300bd426-4394-4f3d-9691-38c40b380222	Mấy Cấy Lúa Châu Âu Thông Minh	Cực kì tiện dụng mà năng suất  lại cực kì cao quý vị!	12900000.00	Máy móc	\N	0347567346	0	2026-04-02 11:37:40.688602+00	2026-04-02 11:37:40.688602+00	pending	\N	\N	\N
d3f1f0ec-b655-40be-8960-75d309a66173	6c45203b-a5ff-4f1c-be40-6bce6188f757	Tấm Bạt Phủ Nông Nghiệp Lớn	Gía cả phải chnagw, năng suất tăng nhanh	29000000.00	Vật tư	\N	0585709743	0	2026-04-02 11:47:23.602634+00	2026-04-02 11:47:23.602634+00	pending	\N	\N	\N
4345c971-4cde-4676-891e-7fc66676b34b	300bd426-4394-4f3d-9691-38c40b380222	Máy tưới Tiêu Châu ÂU	Cực kì tiện lợi Bà Con ơi	34000000.00	Thiết bị đo	\N	0456734567	0	2026-04-02 11:40:17.30768+00	2026-04-02 11:40:17.30768+00	pending	\N	\N	\N
c0330ce4-892b-41e8-9eab-a0c4f7d638c3	6c45203b-a5ff-4f1c-be40-6bce6188f757	Giống lúa ST24 và ST25 	🌾 Giống lúa ST24 – ST25 (Dòng lúa thơm chất lượng cao Việt Nam)\n\nST24 và ST25 là hai giống lúa thơm cao cấp do nhóm kỹ sư Việt Nam lai tạo, nổi bật về chất lượng gạo, khả năng thích nghi điều kiện khắc nghiệt và giá trị kinh tế cao, đặc biệt phù hợp với khu vực Đồng bằng sông Cửu Long.\n\n🔹 Đặc điểm nổi bật\n\n🌱 Thời gian sinh trưởng: Trung – ngắn ngày, phù hợp nhiều mùa vụ\n\n🌾 Năng suất: Cao và ổn định, ít biến động giữa các vụ\n\n💧 Khả năng thích nghi:\n\nChịu mặn, chịu phèn tốt\n\nPhù hợp vùng ven biển, vùng chịu tác động của biến đổi khí hậu\n\n🛡️ Kháng sâu bệnh: Khá tốt, giảm chi phí thuốc bảo vệ thực vật\n\n🔹 Chất lượng gạo\n\n🍚 Hạt gạo dài, trắng trong, ít bạc bụng\n\n🌸 Mùi thơm tự nhiên (lá dứa), cơm mềm, dẻo vừa\n\n❄️ Để nguội vẫn ngon, phù hợp tiêu chuẩn xuất khẩu cao cấp\n\n🏆 ST25 từng được công nhận là “Gạo ngon nhất thế giới”, góp phần nâng tầm thương hiệu lúa gạo Việt Nam\n\n🔹 Giá trị kinh tế\n\n📈 Giá bán cao hơn lúa thường, đầu ra ổn định\n\n💰 Phù hợp mô hình liên kết chuỗi giá trị:\nNông dân – Doanh nghiệp – Ngân hàng\n\n🔄 Giúp nông dân:\n\nGiảm rủi ro thất mùa\n\nTăng thu nhập bền vững\n\nDễ tiếp cận tín dụng và bao tiêu sản phẩm\n\n🔹 Vai trò trong mô hình sản xuất hiện đại\n\nLà giống lõi trong các mô hình:\n\nCanh tác thông minh\n\nSản xuất nông nghiệp bền vững\n\nỨng phó xâm nhập mặn & biến đổi khí hậu\n\nPhù hợp tích hợp vào App nông nghiệp one-stop-shop:\n\nCung ứng giống – vật tư\n\nTheo dõi mùa vụ	3000000.00	Giống cây trồng	\N	0388642960	30	2026-01-25 01:35:18.734685+00	2026-09-11 16:30:25.310812+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-25 01:35:46.941643+00
c1396478-b36b-455a-a850-f782c2817dbb	2175a36f-c2d5-431a-9482-04d3bd25e53f	Máy đo độ mặn nước cầm tay SmartSalinity SCL-2026	Máy đo độ mặn cầm tay chuyên dùng cho nông dân vùng Đồng bằng Sông Cửu Long nhằm kiểm tra độ mặn trong nước tưới (đặc biệt tại các tỉnh như Bến Tre, Sóc Trăng, Trà Vinh). Thiết bị cho kết quả nhanh trong 3 giây với độ chính xác cao (±0.1‰), giúp nông dân chủ động quyết định thời điểm lấy nước vào ruộng hoặc vườn cây.	1250000.00	Thiết bị đo	\N	0912345678	0	2026-04-02 11:45:31.57301+00	2026-04-02 11:45:31.57301+00	pending	\N	\N	\N
37360082-90e8-43d8-b7db-de1c569476f7	37f5ce8a-f218-4ec7-87d0-52967b78be4e	Máy cày	Tôi muốn bán máy cày đã qua sử dụng. Có gì liên hệ với số điện thoại trên qua Zalo hihi	100000000.00	Máy móc	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/product-images/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1767462153531.jpg	0399746618	58	2026-01-03 17:42:34.277548+00	2026-09-11 16:30:25.331327+00	approved	\N	\N	\N
8ef76374-c486-4e2d-811a-0b82ad202333	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	HỆ THỐNG TƯỚI TIÊU EU	Hệ thống tưới tiêu theo chuẩn EU là mô hình quản lý nước thông minh, dựa trên dữ liệu và tự động hóa, nhằm cung cấp lượng nước chính xác cho cây trồng đúng thời điểm, đồng thời tối ưu tài nguyên và thích ứng với biến đổi khí hậu.	1200000.00	Hệ thống tưới	\N	0388642588	34	2026-01-25 03:46:32.360262+00	2026-09-11 16:30:25.296489+00	approved	\N	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-25 03:47:15.905498+00
3e974016-6e14-4d54-959c-87aebb8f3892	2175a36f-c2d5-431a-9482-04d3bd25e53f	Combo phân bón hữu cơ vi sinh cho sầu riêng – xoài ĐBSCL	Bộ sản phẩm phân bón hữu cơ vi sinh chuyên dùng cho cây ăn trái tại Đồng bằng Sông Cửu Long (xoài Cao Lãnh, sầu riêng Cái Mơn...). Giúp cải tạo đất, tăng độ tơi xốp và nâng cao năng suất trái.	890000.00	Phân bón	\N	0987654321	0	2026-04-02 11:47:21.255835+00	2026-04-02 11:47:21.255835+00	pending	\N	\N	\N
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, username, phone_number, role, organization_id, created_at, updated_at, points, avatar_url, is_admin, is_banned, banned_reason, banned_at, banned_by) FROM stdin;
b1294c8d-cc65-480c-92ff-0e23cd927b59	tuan	+84399746618	farmer	\N	2026-01-02 06:30:01.784044+00	2026-01-02 06:30:01.784044+00	0	\N	f	f	\N	\N	\N
ca4f0215-5ca1-451f-b545-0d8c1f26ba2d	test	+84399746618	farmer	\N	2026-01-02 07:00:18.130912+00	2026-01-02 07:00:18.130912+00	0	\N	f	f	\N	\N	\N
6f932260-b9fc-4beb-8d78-32d4168de1b1	testuser	+84912345678	farmer	\N	2026-01-09 01:23:35.958853+00	2026-01-09 01:23:35.958853+00	0	\N	f	f	\N	\N	\N
00cbea4e-de0d-4a84-bdb2-994e70fe08bf	datchung_218	+84945656235	farmer	\N	2026-01-16 06:36:30.296266+00	2026-01-16 07:01:01.477162+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/00cbea4e-de0d-4a84-bdb2-994e70fe08bf/1768546859731.webp	f	f	\N	\N	\N
bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	nguyen_anh_linh	+84835403392	farmer	\N	2026-01-16 06:32:27.042229+00	2026-01-16 07:04:14.593602+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209/1768547053424.jpg	f	f	\N	\N	\N
fdf1d936-7cf1-4b66-814a-4635d84a2455	test_1	+84399746618	farmer	\N	2026-01-16 11:42:40.265683+00	2026-01-16 11:42:40.265683+00	0	\N	f	f	\N	\N	\N
691cc91c-15d6-462b-a4dd-ebb24574b096	testuser_2	+84399746619	farmer	\N	2026-01-16 15:15:07.166792+00	2026-01-16 15:15:07.166792+00	0	\N	f	f	\N	\N	\N
1993de5f-2df4-4232-bdaf-96681211700f	tuan123	+84399746615	farmer	\N	2026-01-16 15:21:55.044372+00	2026-01-16 15:21:55.044372+00	0	\N	f	f	\N	\N	\N
8f32cdc7-ccbc-4c9a-87f7-bca308f87349	jack97	+84399746620	farmer	\N	2026-01-16 15:49:32.847355+00	2026-01-16 15:49:32.847355+00	0	\N	f	f	\N	\N	\N
6c836d7e-cf23-4001-bf1f-e9b6ee09de2d	jack_97	+84399746630	farmer	\N	2026-01-16 16:01:42.558385+00	2026-01-16 16:01:42.558385+00	0	\N	f	f	\N	\N	\N
79e0fa0b-9ca6-433a-925c-689801a402c7	loc	+84399746650	farmer	\N	2026-01-16 16:35:17.813342+00	2026-01-16 16:35:17.813342+00	0	\N	f	f	\N	\N	\N
0ee6e332-1888-4b58-8c1b-6d67fe44a59b	ads	+84399746699	farmer	\N	2026-01-16 16:45:03.744813+00	2026-01-16 16:45:03.744813+00	0	\N	f	f	\N	\N	\N
d7b8b6cd-75cf-4324-b3ce-975a95849477	hack	+84399746688	farmer	\N	2026-01-16 17:15:22.155786+00	2026-01-16 17:15:22.155786+00	0	\N	f	f	\N	\N	\N
532e3227-3b29-42de-b1c2-317510d0b559	badge	+84399746670	farmer	\N	2026-01-17 09:32:09.74619+00	2026-01-17 09:32:09.74619+00	0	\N	f	f	\N	\N	\N
dd5e2f80-2fb3-45ac-9e38-b7a054f820cd	leader	+84399756609	farmer	\N	2026-01-17 09:50:01.127187+00	2026-01-17 09:50:01.127187+00	0	\N	f	f	\N	\N	\N
becff985-c6d5-4413-8bc9-4ef86fa5ac52	uni_test	+84399756634	farmer	\N	2026-01-17 10:26:30.221986+00	2026-01-17 10:26:30.221986+00	0	\N	f	f	\N	\N	\N
df685ac0-6065-4547-80f1-71997bc5684e	univ	+84399756645	farmer	\N	2026-01-17 10:36:58.509901+00	2026-01-17 10:36:58.509901+00	0	\N	f	f	\N	\N	\N
9ce9ba21-e14e-45b9-b634-72c14b65f1ec	oke	+84399756635	farmer	\N	2026-01-17 10:42:16.931068+00	2026-01-17 10:42:16.931068+00	0	\N	f	f	\N	\N	\N
76fb9807-6735-478f-a363-79fb2a20be7f	oke_1	+84388574453	farmer	\N	2026-01-17 10:46:06.861652+00	2026-01-17 10:46:06.861652+00	0	\N	f	f	\N	\N	\N
37f5ce8a-f218-4ec7-87d0-52967b78be4e	dat	+84399746611	farmer	\N	2026-01-02 06:26:15.398513+00	2026-01-17 16:41:37.886919+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1768314820803.png	t	f	\N	\N	\N
b84557f5-40ad-4376-8d50-cdf78aac9c07	test_ban	+84344657745	farmer	\N	2026-01-17 16:52:05.699942+00	2026-01-17 16:52:47.940226+00	0	\N	f	t	test	2026-01-17 16:52:47.940226+00	37f5ce8a-f218-4ec7-87d0-52967b78be4e
11c5a34a-a000-45e4-a301-09a98be93ba0	anhtuan	+84585708372	farmer	\N	2026-01-17 11:23:58.428637+00	2026-01-17 17:49:12.114436+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/11c5a34a-a000-45e4-a301-09a98be93ba0/1768672150383.jpeg	f	f	\N	\N	\N
9251db17-0835-41c7-8469-28dee88096b1	anhtuanne	+84585708372	farmer	\N	2026-01-18 11:38:28.439032+00	2026-01-18 11:38:28.439032+00	0	\N	f	f	\N	\N	\N
ca24214f-9f3f-40f2-8c59-900f3124c5c8	nab	+84585708372	business	\N	2026-01-19 14:59:54.882492+00	2026-01-19 14:59:54.882492+00	0	\N	f	f	\N	\N	\N
e977b62e-005f-4c17-9384-1f9a6283ca02	quangtmdt	+84345267946	farmer	\N	2026-01-19 16:08:54.219694+00	2026-01-19 16:08:54.219694+00	0	\N	f	f	\N	\N	\N
1c1df301-da2b-4ed7-aa41-bf216a66d009	anhtuankhac	+84585708372	farmer	\N	2026-01-20 05:59:12.239273+00	2026-01-20 06:04:29.872918+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/1c1df301-da2b-4ed7-aa41-bf216a66d009/1768889065430.jpeg	f	f	\N	\N	\N
06558882-7a10-4b69-b8e0-4fef2684a434	tranthisinh	+84388642780	farmer	\N	2026-01-21 07:16:30.692421+00	2026-01-21 07:16:30.692421+00	0	\N	f	f	\N	\N	\N
e65ce75b-fdd6-4b2b-b6c8-c189c5030404	vinafoodii	+84585708372	business	\N	2026-01-21 07:30:37.054133+00	2026-01-21 07:38:23.393892+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/e65ce75b-fdd6-4b2b-b6c8-c189c5030404/1768981102147.jpg	f	f	\N	\N	\N
c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	nguyenanhtuan	+84585708372	farmer	\N	2026-01-21 07:45:17.676305+00	2026-01-21 07:45:17.676305+00	0	\N	f	f	\N	\N	\N
48e0eab7-7b01-4df7-a7d7-e0a568853c4d	nguyenthilanh	+84356785234	farmer	\N	2026-01-21 09:01:36.749784+00	2026-01-21 09:01:36.749784+00	0	\N	f	f	\N	\N	\N
9f377073-462e-4308-a72c-f1a6ccbea515	truongdinhchieu	+84388747390	farmer	\N	2026-01-21 09:05:23.714253+00	2026-01-21 09:05:23.714253+00	0	\N	f	f	\N	\N	\N
36597eb2-1818-4c3f-b98e-6ba968c77dc4	nguyenvancuong	+84935789209	farmer	\N	2026-01-21 09:06:39.35298+00	2026-01-21 09:06:39.35298+00	0	\N	f	f	\N	\N	\N
c43b8800-64e8-4207-a797-6e432afc37d2	phanlychi	+84975367245	farmer	\N	2026-01-21 09:09:29.440791+00	2026-01-21 09:09:29.440791+00	0	\N	f	f	\N	\N	\N
a359520f-7b6e-4aff-9265-bb33afa669f5	nguyendantruong	+84976543245	farmer	\N	2026-01-21 09:13:24.889037+00	2026-01-21 09:13:24.889037+00	0	\N	f	f	\N	\N	\N
be1c325d-845a-4e30-bdc0-0a4b90419b71	buitruongsinh	+84585708374	farmer	\N	2026-01-21 09:15:39.374762+00	2026-01-21 09:15:39.374762+00	0	\N	f	f	\N	\N	\N
a49342a7-3158-433b-a256-172b68d1de57	lyhaonhien	+84388642760	farmer	\N	2026-01-21 09:21:24.548066+00	2026-01-21 09:21:24.548066+00	0	\N	f	f	\N	\N	\N
6f195582-f9ea-4c5e-a7d5-21836e0ebff3	vovantan	+84595708463	farmer	\N	2026-01-21 09:25:28.344892+00	2026-01-21 09:25:28.344892+00	0	\N	f	f	\N	\N	\N
e66c8ff2-f269-4bf0-8d22-58731ba77517	phanvangiang	+84356890234	farmer	\N	2026-01-21 09:28:21.646193+00	2026-01-21 09:28:21.646193+00	0	\N	f	f	\N	\N	\N
1bc4ec39-cc14-44dd-8738-8ce6324d9f2e	phanvannam	+84345241240	farmer	\N	2026-01-21 09:32:43.095174+00	2026-01-21 09:32:43.095174+00	0	\N	f	f	\N	\N	\N
1eb03e4c-c9b4-4db4-94d0-3d382e6ed638	phanhaonhien	+84585708372	farmer	\N	2026-01-21 09:35:13.031876+00	2026-01-21 09:35:13.031876+00	0	\N	f	f	\N	\N	\N
de671e87-8ed3-480f-a6af-d7707a4b75c9	nongbinhbac	+84585790456	farmer	\N	2026-01-21 09:36:28.567546+00	2026-01-21 09:36:28.567546+00	0	\N	f	f	\N	\N	\N
535c19e9-df3b-46c1-95dc-f93cb3f22afe	phamthanhthao	+84388649602	farmer	\N	2026-01-21 09:38:51.267899+00	2026-01-21 09:40:42.546922+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/535c19e9-df3b-46c1-95dc-f93cb3f22afe/1768988441148.jpg	f	f	\N	\N	\N
b7215524-a4d6-4661-a7c3-83643d53bc8d	phanvancu	+84388679046	farmer	\N	2026-01-21 09:44:07.269355+00	2026-01-21 09:48:06.724663+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/b7215524-a4d6-4661-a7c3-83643d53bc8d/1768988885549.jpg	f	f	\N	\N	\N
8c016324-b2b4-42b8-a89f-a46687f7e589	ngu	+84324567456	farmer	\N	2026-01-21 09:52:34.011235+00	2026-01-21 09:52:34.011235+00	0	\N	f	f	\N	\N	\N
02d46548-0441-412d-b12b-f0830a264840	nguyenvansinh	+84912345673	farmer	\N	2026-01-21 09:54:12.23914+00	2026-01-21 09:54:12.23914+00	0	\N	f	f	\N	\N	\N
bf7fddef-097c-4ab3-902c-1518c74a15cf	nguyengiang	+84568345234	farmer	\N	2026-01-21 09:55:19.832803+00	2026-01-21 09:55:19.832803+00	0	\N	f	f	\N	\N	\N
6c45203b-a5ff-4f1c-be40-6bce6188f757	nguyenvanb	+84585708372	farmer	\N	2026-01-16 06:53:39.672691+00	2026-01-21 10:06:20.66026+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/6c45203b-a5ff-4f1c-be40-6bce6188f757/1768989979035.jpg	f	f	\N	\N	\N
df78758b-da56-491d-a5c4-0c57316a771b	nguyenlytuong	+84385467356	farmer	\N	2026-01-21 10:20:21.772327+00	2026-01-21 10:20:21.772327+00	0	\N	f	f	\N	\N	\N
8c6c740c-b564-48ae-9b85-a164e99155fd	tranthilan	+84585708324	farmer	\N	2026-01-21 10:22:00.849696+00	2026-01-21 10:22:00.849696+00	0	\N	f	f	\N	\N	\N
97d42fa7-76a1-41f1-bedc-90ee426c32bf	phanchautrinh	+84578356245	farmer	\N	2026-01-21 10:24:01.26869+00	2026-01-21 10:24:01.26869+00	0	\N	f	f	\N	\N	\N
e7a0fa21-d8ac-4223-88d2-a22f26d849a9	nguyenthitrucuyen	+84585708372	farmer	\N	2026-01-21 10:25:45.98215+00	2026-01-21 10:25:45.98215+00	0	\N	f	f	\N	\N	\N
c0fb76fc-499a-4cfc-af09-670d86c6f6b8	tranducchien	+84388645789	farmer	\N	2026-01-21 10:27:11.252788+00	2026-01-21 10:27:11.252788+00	0	\N	f	f	\N	\N	\N
4975439b-f977-44a7-b6ac-cecd2732e105	trananhtu	+84585708372	farmer	\N	2026-01-21 10:27:59.443291+00	2026-01-21 10:27:59.443291+00	0	\N	f	f	\N	\N	\N
8bc0ba75-9312-45a3-9848-b6d2ff53501c	nguyenphuongly	+84585708372	farmer	\N	2026-01-21 10:28:53.456108+00	2026-01-21 10:28:53.456108+00	0	\N	f	f	\N	\N	\N
ab956951-8ac0-4c28-9c8c-0a76af78c939	nguyenbanhtien	+84987634511	farmer	\N	2026-01-21 10:29:59.849009+00	2026-01-21 10:29:59.849009+00	0	\N	f	f	\N	\N	\N
adf30da1-b20e-4474-9dab-6a7d8a1ea2c1	nguyenlongdinh	+84987654345	farmer	\N	2026-01-21 10:31:24.129047+00	2026-01-21 10:31:24.129047+00	0	\N	f	f	\N	\N	\N
00c9aa5d-0912-4be0-9d96-d90d74d25438	hoanglananh	+84987654343	farmer	\N	2026-01-21 10:32:37.292002+00	2026-01-21 10:32:37.292002+00	0	\N	f	f	\N	\N	\N
4c9b06d2-6e48-490f-9aca-827a7b94d76b	nguyendinhquan	+84987654567	farmer	\N	2026-01-21 10:33:36.646247+00	2026-01-21 10:33:36.646247+00	0	\N	f	f	\N	\N	\N
766613de-ab18-45a2-9c57-ab6e838c91aa	nguyenkhanhlinh	+84987654567	farmer	\N	2026-01-21 10:34:33.013563+00	2026-01-21 10:34:33.013563+00	0	\N	f	f	\N	\N	\N
a180426f-c6d9-4ed7-b56b-c299364d2c4f	dipminhchau	+84987654341	farmer	\N	2026-01-21 10:46:29.204449+00	2026-01-21 10:46:29.204449+00	0	\N	f	f	\N	\N	\N
9b348117-d9c8-44b7-b321-4c8a3ce50818	phannhathy	+84378567345	farmer	\N	2026-01-22 00:33:59.27113+00	2026-01-22 00:33:59.27113+00	0	\N	f	f	\N	\N	\N
511c3f9d-9125-4586-b351-45348ad11743	lanquynhanh	+84585708372	farmer	\N	2026-01-22 00:34:54.591911+00	2026-01-22 00:34:54.591911+00	0	\N	f	f	\N	\N	\N
c9af8e81-b717-4d88-9a7c-5f821c0a384e	nguyentanphat	+84585708372	farmer	\N	2026-01-22 00:38:32.557758+00	2026-01-22 00:38:32.557758+00	0	\N	f	f	\N	\N	\N
e391e0c4-a811-4ac0-9989-b426e101833d	nguyentutrinh	+84987654567	farmer	\N	2026-01-22 00:39:36.644104+00	2026-01-22 00:39:36.644104+00	0	\N	f	f	\N	\N	\N
50644fc3-8363-44f2-836e-61b3a252478d	phanquynhanhh	+84334567231	farmer	\N	2026-01-22 00:41:31.654125+00	2026-01-22 00:41:31.654125+00	0	\N	f	f	\N	\N	\N
529cb4b3-5936-4705-be79-f332013e0beb	phamqanhoanh	+84534768902	farmer	\N	2026-01-22 00:42:40.985168+00	2026-01-22 00:42:40.985168+00	0	\N	f	f	\N	\N	\N
eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	nguyenyenvy	+84356432134	farmer	\N	2026-01-22 00:43:52.246309+00	2026-01-22 00:43:52.246309+00	0	\N	f	f	\N	\N	\N
c35ce40a-b44f-49a7-aa8e-ed95060759b1	nguyentuuyen	+84764657891	farmer	\N	2026-01-22 00:45:46.488418+00	2026-01-22 00:45:46.488418+00	0	\N	f	f	\N	\N	\N
6137e67a-d461-46fd-ac2a-17ce6c29b22f	phanquananh	+84388657890	farmer	\N	2026-01-22 00:47:14.072054+00	2026-01-22 00:47:14.072054+00	0	\N	f	f	\N	\N	\N
791939bf-486b-4d03-98df-7eefd4aa15f2	phamdinhquangg	+84567432850	farmer	\N	2026-01-22 00:48:32.737037+00	2026-01-22 00:48:32.737037+00	0	\N	f	f	\N	\N	\N
24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	nguyentantrung	+84987654569	farmer	\N	2026-01-22 00:50:39.744593+00	2026-01-22 00:50:39.744593+00	0	\N	f	f	\N	\N	\N
fc6c6611-60cb-44d8-8de7-613f7d7869b5	phankyy	+84987654561	farmer	\N	2026-01-22 00:51:53.844767+00	2026-01-22 00:51:53.844767+00	0	\N	f	f	\N	\N	\N
8d390cb3-59e1-45c3-93a0-1459b74498a4	nguyenbaoly	+84567876541	farmer	\N	2026-01-22 00:53:03.080417+00	2026-01-22 00:53:03.080417+00	0	\N	f	f	\N	\N	\N
c801a58c-8dde-4ff0-9193-cd33de0e1e03	phamkyuyenan	+84908765461	farmer	\N	2026-01-22 01:00:27.145826+00	2026-01-22 01:00:27.145826+00	0	\N	f	f	\N	\N	\N
c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	tranhungthu	+84585798456	farmer	\N	2026-01-22 01:03:52.947145+00	2026-01-22 01:03:52.947145+00	0	\N	f	f	\N	\N	\N
71415285-c1cb-4855-82ee-37585c51eef9	vophanbaoloan	+84388643860	farmer	\N	2026-01-22 01:09:08.151066+00	2026-01-22 01:09:08.151066+00	0	\N	f	f	\N	\N	\N
d40eddeb-94f1-4a8e-b05e-f8a02843b691	phamquynhanhgiang	+84356789309	farmer	\N	2026-01-22 01:11:27.854089+00	2026-01-22 01:11:27.854089+00	0	\N	f	f	\N	\N	\N
0a0c0f64-1a4d-4973-ba98-942a0a381c8a	trancongphong	+84345678981	farmer	\N	2026-01-22 01:13:20.338368+00	2026-01-22 01:13:20.338368+00	0	\N	f	f	\N	\N	\N
1919a069-3c62-4408-9f6b-aba65bbdcce7	nguyenmanhtuantran	+84585708473	farmer	\N	2026-01-22 01:16:35.759786+00	2026-01-22 01:16:35.759786+00	0	\N	f	f	\N	\N	\N
bb43659c-077c-41d9-b37d-c80d89428cb5	nguyenbuinhaly	+84388642873	farmer	\N	2026-01-22 01:17:45.468224+00	2026-01-22 01:17:45.468224+00	0	\N	f	f	\N	\N	\N
31b8206a-ea5d-41cf-968e-6f19b87aba62	manhlantu	+84347898783	farmer	\N	2026-01-22 01:18:37.882863+00	2026-01-22 01:18:37.882863+00	0	\N	f	f	\N	\N	\N
dff3c363-ffbe-42ec-8639-3d1165ec6ccf	nguyentriphuong	+84388645789	farmer	\N	2026-01-22 01:19:40.236682+00	2026-01-22 01:19:40.236682+00	0	\N	f	f	\N	\N	\N
761258bd-d832-4b3e-8f14-bb8e3f934d26	nguyenphamkyduyen	+84356780345	farmer	\N	2026-01-22 01:20:50.819201+00	2026-01-22 01:20:50.819201+00	0	\N	f	f	\N	\N	\N
f8e9a265-897e-43b8-adee-a431e9c3bee9	tranthicuctu	+84388745612	farmer	\N	2026-01-22 01:22:37.447254+00	2026-01-22 01:22:37.447254+00	0	\N	f	f	\N	\N	\N
837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	nguyenlytung	+84585708342	farmer	\N	2026-01-22 01:24:04.887501+00	2026-01-22 01:24:04.887501+00	0	\N	f	f	\N	\N	\N
54f5d7bb-aa49-4490-8ad0-7a95b5defa23	trananhtoan	+84534275643	farmer	\N	2026-01-22 01:25:53.318653+00	2026-01-22 01:25:53.318653+00	0	\N	f	f	\N	\N	\N
65b54fdc-6983-4242-8b99-823e47f3a0a7	phamquynh	+84359352424	farmer	\N	2026-01-22 01:27:18.303981+00	2026-01-22 01:27:18.303981+00	0	\N	f	f	\N	\N	\N
cfd6e3a8-82ce-4a45-b613-0e78fa463439	luumonglung	+84987654567	farmer	\N	2026-01-22 01:29:54.152651+00	2026-01-22 01:29:54.152651+00	0	\N	f	f	\N	\N	\N
af98d38f-7f5e-42d6-8349-e30c5a006801	nguyentankhiem	+84987654567	farmer	\N	2026-01-22 01:31:23.323111+00	2026-01-22 01:31:23.323111+00	0	\N	f	f	\N	\N	\N
5981f73f-c8eb-46ca-97cf-61bb2373bc52	nguyenphuongtrinh	+84987656781	farmer	\N	2026-01-22 01:38:23.211181+00	2026-01-22 01:38:23.211181+00	0	\N	f	f	\N	\N	\N
4733c4f2-b333-4f33-8526-490f50a57499	tranthingocanh	+84987654567	farmer	\N	2026-01-22 01:39:37.889234+00	2026-01-22 01:39:37.889234+00	0	\N	f	f	\N	\N	\N
4f95bb6c-f9fd-4aa4-987d-d38b18473aea	phannhutdangkhoa	+84345789924	farmer	\N	2026-01-22 01:41:23.539146+00	2026-01-22 01:41:23.539146+00	0	\N	f	f	\N	\N	\N
d8ea0add-dca7-4d96-9a64-1ecdde0292b3	nguyenainhan	+84912344561	farmer	\N	2026-01-22 01:43:10.610809+00	2026-01-22 01:43:10.610809+00	0	\N	f	f	\N	\N	\N
d28140c0-4739-4adb-b40c-dad97b2551bd	phamtheanh	+84987654323	farmer	\N	2026-01-22 01:44:41.526835+00	2026-01-22 01:44:41.526835+00	0	\N	f	f	\N	\N	\N
29573c2b-fdf5-4831-974c-9851cb4d9fc3	phamhuonggiangnha	+84366383813	farmer	\N	2026-01-22 01:46:53.129146+00	2026-01-22 01:46:53.129146+00	0	\N	f	f	\N	\N	\N
1e2967ab-e057-4927-8fe4-b2f769a5a6df	trantantrungtung	+84987654567	farmer	\N	2026-01-22 01:48:26.997213+00	2026-01-22 01:48:26.997213+00	0	\N	f	f	\N	\N	\N
8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	nguyentienlinh	+84987654567	farmer	\N	2026-01-22 01:50:01.917912+00	2026-01-22 01:50:01.917912+00	0	\N	f	f	\N	\N	\N
2db4ea8e-3ab0-48cf-a4db-1e1d18d4f8de	nguyenthinhuhang	+84987654561	farmer	\N	2026-01-22 01:52:10.326592+00	2026-01-22 01:52:10.326592+00	0	\N	f	f	\N	\N	\N
b9163fcb-75ec-4a35-8d45-1547315401ac	phamthuytrang	+84987654565	farmer	\N	2026-01-22 01:53:15.380527+00	2026-01-22 01:53:15.380527+00	0	\N	f	f	\N	\N	\N
d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	dohongthoai	+84987654341	farmer	\N	2026-01-22 01:55:41.704124+00	2026-01-22 01:55:41.704124+00	0	\N	f	f	\N	\N	\N
ae856958-69bf-432e-bab2-262340b92e0d	dothanhnhan	+84987654511	farmer	\N	2026-01-22 01:58:29.383333+00	2026-01-22 01:58:29.383333+00	0	\N	f	f	\N	\N	\N
2f835397-40fb-430f-96bb-3b23e988950e	phanthanhnhan	+84987654345	farmer	\N	2026-01-22 02:00:24.606276+00	2026-01-22 02:00:24.606276+00	0	\N	f	f	\N	\N	\N
5c53db2c-057e-4bf6-9782-31a25c74e269	tranlequan	+84987654341	farmer	\N	2026-01-22 02:02:44.068608+00	2026-01-22 02:02:44.068608+00	0	\N	f	f	\N	\N	\N
e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	nguyenlehailong	+84987654567	farmer	\N	2026-01-22 02:04:18.693406+00	2026-01-22 02:04:18.693406+00	0	\N	f	f	\N	\N	\N
b6d92a45-c510-4686-9f25-824bc32e96cb	tranthituyetnhu	+84987654356	farmer	\N	2026-01-22 02:07:57.010885+00	2026-01-22 02:07:57.010885+00	0	\N	f	f	\N	\N	\N
e7192c5a-5314-4d99-a0e9-cf235dcad2cc	nguyenthibaotran	+84987654345	farmer	\N	2026-01-22 02:09:08.598789+00	2026-01-22 02:09:08.598789+00	0	\N	f	f	\N	\N	\N
62ba9225-b9c3-4760-9c1a-bab4f9a318e8	hoanganh	+84987654561	farmer	\N	2026-01-22 02:11:07.248187+00	2026-01-22 02:11:07.248187+00	0	\N	f	f	\N	\N	\N
143a5beb-1342-40f7-b9ef-3431b4c44da4	nguyentuandat	+84987654345	farmer	\N	2026-01-22 02:12:15.353054+00	2026-01-22 02:12:15.353054+00	0	\N	f	f	\N	\N	\N
3f43944a-64de-489a-aac4-7564b6367304	hominhkhang	+84987654567	farmer	\N	2026-01-22 02:13:57.282636+00	2026-01-22 02:13:57.282636+00	0	\N	f	f	\N	\N	\N
5e6a591b-bf61-46aa-9502-9f9baaa0cc93	nguyendinhhiep	+84987656781	farmer	\N	2026-01-22 02:15:08.949118+00	2026-01-22 02:15:08.949118+00	0	\N	f	f	\N	\N	\N
9a92b411-973c-485e-9572-541a3989be22	nguyenthanhdat	+84965456781	farmer	\N	2026-01-22 02:16:14.228925+00	2026-01-22 02:16:14.228925+00	0	\N	f	f	\N	\N	\N
4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	nguyendinhhuy	+84987656571	farmer	\N	2026-01-22 02:17:24.487876+00	2026-01-22 02:17:24.487876+00	0	\N	f	f	\N	\N	\N
27cdf08b-ca0b-45a6-99c7-34e2927dea2d	vohoangtuanhai	+84987654567	farmer	\N	2026-01-22 02:18:46.303305+00	2026-01-22 02:18:46.303305+00	0	\N	f	f	\N	\N	\N
a3f52365-5616-4ae8-8b9d-dfba52c94270	hotrongphuc	+84987654345	farmer	\N	2026-01-22 02:19:56.382172+00	2026-01-22 02:19:56.382172+00	0	\N	f	f	\N	\N	\N
37868e58-66d7-4803-a276-eb6da072b972	phamthiphuongnam	+84987678761	farmer	\N	2026-01-22 02:21:32.260328+00	2026-01-22 02:21:32.260328+00	0	\N	f	f	\N	\N	\N
b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	hatrannhaky	+84987657561	farmer	\N	2026-01-22 02:23:38.730097+00	2026-01-22 02:23:38.730097+00	0	\N	f	f	\N	\N	\N
f404aa02-8c39-4c40-850e-f7f13b9a2adb	phamminhthu	+84987645465	farmer	\N	2026-01-22 02:25:06.519612+00	2026-01-22 02:25:06.519612+00	0	\N	f	f	\N	\N	\N
eb7de62b-d4c8-4e76-a75e-b32af563a4c0	leduonganhkhoa	+84388642960	farmer	\N	2026-01-22 03:08:56.394308+00	2026-01-22 03:08:56.394308+00	0	\N	f	f	\N	\N	\N
44d5783f-4535-4541-bb10-efcf81eec4a3	nguyentandat	+84987634525	farmer	\N	2026-01-22 03:10:22.535402+00	2026-01-22 03:10:22.535402+00	0	\N	f	f	\N	\N	\N
4104824d-4aaa-4ce4-b304-d1074d61fba6	dangngochoangthanh	+84954807807	farmer	\N	2026-01-22 03:11:35.78583+00	2026-01-22 03:11:35.78583+00	0	\N	f	f	\N	\N	\N
dbda9c37-7eac-4e1e-9c74-bd66e80bb924	lyminhdat	+84585708345	farmer	\N	2026-01-22 03:13:01.711425+00	2026-01-22 03:13:01.711425+00	0	\N	f	f	\N	\N	\N
6fb4e6fd-e573-4551-8480-91aaa0d63b80	tranduy	+84388642980	farmer	\N	2026-01-22 03:14:33.830166+00	2026-01-22 03:14:33.830166+00	0	\N	f	f	\N	\N	\N
6d277ecb-1abf-4361-b0c3-0948f3b8d234	nguyenquynhnghi	+84987568828	farmer	\N	2026-01-22 03:16:41.472726+00	2026-01-22 03:16:41.472726+00	0	\N	f	f	\N	\N	\N
7646b385-d2e4-4b95-acc5-c816e3cd1412	nguyenminhtam	+84585708372	farmer	\N	2026-01-22 03:18:14.966953+00	2026-01-22 03:18:14.966953+00	0	\N	f	f	\N	\N	\N
57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	phamngulao	+84987456476	farmer	\N	2026-01-22 03:19:42.646639+00	2026-01-22 03:19:42.646639+00	0	\N	f	f	\N	\N	\N
35dca33b-9d87-448c-80f5-a93eb0940c7f	tranthikimtuyen	+84388652980	farmer	\N	2026-01-22 03:21:56.172714+00	2026-01-22 03:21:56.172714+00	0	\N	f	f	\N	\N	\N
9ec8512b-24ba-4581-a362-6f7a3a6c0235	vodoanhoanglong	+84374628345	farmer	\N	2026-01-22 03:23:55.294146+00	2026-01-22 03:23:55.294146+00	0	\N	f	f	\N	\N	\N
4b1f27f6-2ff2-419d-ab56-d008e20d6cfc	phamquynhanhly	+84388642960	farmer	\N	2026-01-22 03:25:03.536188+00	2026-01-22 03:25:03.536188+00	0	\N	f	f	\N	\N	\N
e15551b8-af10-46c7-b62e-b6736ca520cb	vonguyenngocha	+84987646712	farmer	\N	2026-01-22 03:28:24.595719+00	2026-01-22 03:28:24.595719+00	0	\N	f	f	\N	\N	\N
88818637-080c-4c99-ae7d-265f4f7ada85	lamnguyentannam	+84989775621	farmer	\N	2026-01-22 03:30:36.430957+00	2026-01-22 03:30:36.430957+00	0	\N	f	f	\N	\N	\N
8ab57ed4-2107-4880-88a5-93e07bc747d0	truonghoanganh	+84986564833	farmer	\N	2026-01-22 03:32:25.037551+00	2026-01-22 03:32:25.037551+00	0	\N	f	f	\N	\N	\N
bc2344f4-66d6-4dcf-93fa-608871aeb1ba	lieuthilanh	+84388642969	farmer	\N	2026-01-22 03:49:02.707772+00	2026-01-22 03:49:02.707772+00	0	\N	f	f	\N	\N	\N
dca20759-c2ff-496d-8d55-dd9230f92203	nguyentankhim	+84387456214	farmer	\N	2026-01-22 03:50:06.053391+00	2026-01-22 03:50:06.053391+00	0	\N	f	f	\N	\N	\N
24704bb6-2908-44a7-8098-4a188b527805	nguyenthitrucloan	+84334567651	farmer	\N	2026-01-22 03:53:04.728591+00	2026-01-22 03:53:04.728591+00	0	\N	f	f	\N	\N	\N
d8aa2361-6122-40a3-9ae2-93792e236825	truongthanhcong	+84388642860	farmer	\N	2026-01-22 03:54:01.71786+00	2026-01-22 03:54:01.71786+00	0	\N	f	f	\N	\N	\N
5cdf1fbe-a83d-4cb7-b7c1-c1f473856060	nguyenthanhcong	+84376589045	farmer	\N	2026-01-22 03:56:40.403465+00	2026-01-22 03:56:40.403465+00	0	\N	f	f	\N	\N	\N
17bdad1d-532c-4a07-9936-669d62c8ef04	phanvanbai	+84585708372	farmer	\N	2026-01-21 06:43:54.820964+00	2026-01-22 19:28:16.366091+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/17bdad1d-532c-4a07-9936-669d62c8ef04/1769110094918.jpeg	f	f	\N	\N	\N
2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	nguyentankhiem11	+84899511467	farmer	\N	2026-01-23 01:19:44.95089+00	2026-01-23 01:19:44.95089+00	0	\N	f	f	\N	\N	\N
7648394a-dde0-4003-bcae-2277463abdab	haha	+84939556571	farmer	\N	2026-01-24 02:08:26.712193+00	2026-01-24 02:08:26.712193+00	0	\N	f	f	\N	\N	\N
4ee915ec-4c50-4adf-9650-ea4ee740210f	lochuynh	+84889324816	farmer	\N	2026-01-24 03:12:51.199121+00	2026-01-24 03:12:51.199121+00	0	\N	f	f	\N	\N	\N
8513468c-cc3b-4a0b-b92c-fe5c5abfaa50	nablove	+84585708372	farmer	\N	2026-01-25 06:12:28.81065+00	2026-01-25 06:13:05.953217+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/8513468c-cc3b-4a0b-b92c-fe5c5abfaa50/1769321584190.jpeg	f	f	\N	\N	\N
e30a9483-72fc-424d-9617-0e5e040ce685	lovenab	+84585708372	farmer	\N	2026-01-25 06:17:16.852208+00	2026-01-25 06:17:16.852208+00	0	\N	f	f	\N	\N	\N
8781331b-d3d0-4ea5-9ef4-b154cb1a2f4e	laam	+84835403392	farmer	\N	2026-01-26 15:51:02.758005+00	2026-01-26 15:51:02.758005+00	0	\N	f	f	\N	\N	\N
98ebcbeb-44cb-4d6f-89d4-34ec32ef48b8	tuine	+84935246345	farmer	\N	2026-02-06 14:32:02.101999+00	2026-02-06 14:32:02.101999+00	0	\N	f	f	\N	\N	\N
261a6c39-6bc6-4b53-bad9-d8a71b56de92	chokhieem	+84778345467	farmer	\N	2026-02-06 14:35:38.638992+00	2026-02-06 14:35:38.638992+00	0	\N	f	f	\N	\N	\N
2374dd2e-e380-45d4-a350-bedbaae40ad0	nhatnam	+84585708372	farmer	\N	2026-02-18 04:45:32.921387+00	2026-02-18 04:45:32.921387+00	0	\N	f	f	\N	\N	\N
55cc2f62-282e-455d-8d90-675dae449f45	npc	+84384436680	farmer	\N	2026-03-13 14:19:47.729002+00	2026-03-13 14:19:47.729002+00	0	\N	f	f	\N	\N	\N
4e9dd36c-38f2-4353-a320-0c31fa3cc970	nguyentankhiem123	+84819447753	farmer	\N	2026-03-24 14:52:42.008478+00	2026-03-24 14:52:42.008478+00	0	\N	f	f	\N	\N	\N
beee8c36-1731-4a54-92b0-b43e09870208	xuan_ngoc	+84941565503	farmer	\N	2026-03-25 12:16:21.939802+00	2026-03-25 12:16:21.939802+00	0	\N	f	f	\N	\N	\N
c69d726e-a55a-4e43-ac7b-270a4ab83e85	xuan_ngocc	+84941565503	business	\N	2026-03-25 12:38:35.632514+00	2026-03-28 02:45:43.135234+00	0	\N	f	t	.	2026-03-28 02:45:43.135234+00	37f5ce8a-f218-4ec7-87d0-52967b78be4e
9d0ef483-3495-446e-a744-f290c1e4d509	tankhiem123	+84819447753	business	\N	2026-03-25 10:43:27.850866+00	2026-03-28 02:45:52.372047+00	0	\N	f	t	.	2026-03-28 02:45:52.372047+00	37f5ce8a-f218-4ec7-87d0-52967b78be4e
379f1bc6-9510-4e45-a4bc-4d9ba4d40f42	phdhoanganh	+84585708372	farmer	\N	2026-03-30 09:26:57.189324+00	2026-03-30 09:26:57.189324+00	0	\N	f	f	\N	\N	\N
16da4e53-c6ee-427a-9944-3794eaa52a05	kimuyen_1107	+84932698478	farmer	\N	2026-03-30 10:03:34.975438+00	2026-03-30 10:03:34.975438+00	0	\N	f	f	\N	\N	\N
51c3fe03-3301-4ffc-a34a-ed60d5ff9cc0	hihi	+84918123873	business	\N	2026-04-02 11:14:37.948072+00	2026-04-02 11:14:37.948072+00	0	\N	f	f	\N	\N	\N
300bd426-4394-4f3d-9691-38c40b380222	anhtuan12	+84388642969	farmer	\N	2026-04-02 11:31:04.370585+00	2026-04-02 11:31:04.370585+00	0	\N	f	f	\N	\N	\N
2175a36f-c2d5-431a-9482-04d3bd25e53f	dattruong	+84399746613	farmer	\N	2026-04-02 11:31:09.01711+00	2026-04-02 11:31:09.01711+00	0	\N	f	f	\N	\N	\N
bb8f9a70-be4a-4126-ba4b-e2c1752aa465	kiet	+84766656147	farmer	\N	2026-04-02 12:00:55.333474+00	2026-04-02 12:00:55.333474+00	0	\N	f	f	\N	\N	\N
e5cbc967-ea15-403a-829a-5f669791739f	btc_esg	+84585708372	farmer	\N	2026-04-02 09:24:45.958916+00	2026-04-03 02:16:32.892265+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/e5cbc967-ea15-403a-829a-5f669791739f/1775182591800.jpeg	f	f	\N	\N	\N
68c69129-f1de-4538-997d-7e7f1cd24af6	ngoctrammm	+84585780264	farmer	\N	2026-04-03 17:08:13.692488+00	2026-04-03 17:08:13.692488+00	0	\N	f	f	\N	\N	\N
c3fca15a-6ede-4779-bf42-f96081981db2	klinh2001	+84911011411	farmer	\N	2026-04-04 14:02:19.93192+00	2026-04-04 14:02:19.93192+00	0	\N	f	f	\N	\N	\N
fe5c2b78-e465-4b92-8adc-bed5ad2fed48	thuan	+84799541188	farmer	\N	2026-04-04 14:04:16.441749+00	2026-04-04 14:04:16.441749+00	0	\N	f	f	\N	\N	\N
cf82a570-fba6-4d05-87ee-89836563cb98	ngoctram_123	+84968954227	business	\N	2026-04-04 14:05:14.015195+00	2026-04-04 14:05:14.015195+00	0	\N	f	f	\N	\N	\N
660e5db2-b63a-4a80-9e03-61b9676a25f0	anhtu	+84585708374	farmer	\N	2026-04-04 14:06:37.78728+00	2026-04-04 14:06:37.78728+00	0	\N	f	f	\N	\N	\N
0da7a857-7581-4bb4-8fbb-b0bc39d997a7	sharkhoanganh	+84585708372	farmer	\N	2026-04-11 20:15:55.677666+00	2026-04-11 20:17:52.931158+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/0da7a857-7581-4bb4-8fbb-b0bc39d997a7/1775938671727.jpeg	f	f	\N	\N	\N
9529e698-40cf-4b85-a657-d963f2c934c0	idss_ueh	+84585708372	farmer	\N	2026-05-12 02:52:21.253113+00	2026-05-12 02:53:37.562589+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/9529e698-40cf-4b85-a657-d963f2c934c0/1778554415922.png	f	f	\N	\N	\N
2ce59d73-d507-4df2-8254-b780773e6465	idss_ueh_tsnmt	+84383061976	farmer	\N	2026-05-12 02:58:16.513226+00	2026-05-12 02:58:30.129567+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/2ce59d73-d507-4df2-8254-b780773e6465/1778554707853.png	f	f	\N	\N	\N
ad0a9427-eb0a-4f8f-9f62-0f7cc428930e	linh_st25	+84835403392	farmer	\N	2026-06-05 16:08:45.956666+00	2026-06-05 16:08:45.956666+00	0	\N	f	f	\N	\N	\N
287d2d8c-c0ec-4d5f-bdf4-b488c02886a3	nguyendat	+84945656235	farmer	\N	2026-06-09 10:36:12.639857+00	2026-06-09 10:36:12.639857+00	0	\N	f	f	\N	\N	\N
5d100834-5494-4217-ac7c-e02053c4f016	lamchihien	+84987654567	farmer	\N	2026-01-22 01:54:30.077941+00	2026-06-14 04:18:54.738638+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/5d100834-5494-4217-ac7c-e02053c4f016/1781410733258.jpeg	f	f	\N	\N	\N
20585b2e-27e7-42c3-87bb-3ddebb856a7d	btc_celg	+84585708372	farmer	\N	2026-06-14 14:49:35.8269+00	2026-06-14 14:49:47.649722+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/20585b2e-27e7-42c3-87bb-3ddebb856a7d/1781448585224.jpeg	f	f	\N	\N	\N
ef593d11-dafa-4203-8b38-217cb6ece842	eureka	+84585708372	farmer	\N	2026-08-31 05:47:16.935873+00	2026-08-31 05:48:10.207243+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/ef593d11-dafa-4203-8b38-217cb6ece842/1788155288615.jpeg	f	f	\N	\N	\N
8566b0fd-1c92-4f5e-b468-a0b74bfab795	dipminhchau1	+84585708372	farmer	\N	2026-09-02 12:10:20.018775+00	2026-09-02 12:11:00.393929+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/8566b0fd-1c92-4f5e-b468-a0b74bfab795/1788351058168.jpeg	f	f	\N	\N	\N
82701dce-0653-45d3-a690-cac5207d5439	bachduong_123	+84353490084	farmer	\N	2026-09-02 15:56:05.610344+00	2026-09-02 15:56:05.610344+00	0	\N	f	f	\N	\N	\N
9c6170a9-1cfa-4c45-9ef9-ff2ee5b59ac7	luongthibachduong	+84353490084	farmer	\N	2026-09-02 15:57:18.179847+00	2026-09-02 15:57:18.179847+00	0	\N	f	f	\N	\N	\N
8e5489ab-5339-4864-aa29-845a32684bdf	startupzonex_2026	+84345678910	farmer	\N	2026-09-02 22:47:21.561077+00	2026-09-02 22:47:31.609875+00	0	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/avatars/8e5489ab-5339-4864-aa29-845a32684bdf/1788389249915.jpeg	f	f	\N	\N	\N
615c2f8b-50b7-4292-b9ab-8d1c0d7e5e12	duchiep	+84963909735	farmer	\N	2026-09-08 11:22:48.51578+00	2026-09-08 11:22:48.51578+00	0	\N	f	f	\N	\N	\N
\.


--
-- Data for Name: project_follows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_follows (id, user_id, project_id, created_at) FROM stdin;
\.


--
-- Data for Name: project_investments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_investments (id, project_id, investor_id, amount, investor_name, investor_email, investor_phone, message, status, created_at, updated_at, user_type) FROM stdin;
d5cf91f9-9693-484f-a966-10df88dd2f5e	1631e8f0-dc84-455d-82b8-58f239532ea4	71db8ee9-f2ce-4548-bf96-dc4dea252445	100000000	Đoàn Văn Tài		0854059439		confirmed	2026-01-16 06:55:11.920427+00	2026-01-16 06:55:11.920427+00	farmer
7c2eb6b7-7310-444b-bd1b-df3d7d908075	1631e8f0-dc84-455d-82b8-58f239532ea4	ca24214f-9f3f-40f2-8c59-900f3124c5c8	25000000	Phan Khắc Anh Tuấn	nab@gmail.com	0585708372	Hay và thiết thực tôi sẽ đầu tư	confirmed	2026-01-19 15:03:01.685987+00	2026-01-19 15:03:01.685987+00	business
e462bb67-e850-4c92-8b45-618c9396f125	1631e8f0-dc84-455d-82b8-58f239532ea4	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	120000000	VINAFOODII	vinafoodII@gmail.com	0585708374	Oke dự án thiết thực	confirmed	2026-01-21 07:34:48.590778+00	2026-01-21 07:34:48.590778+00	business
8883256c-6097-42b2-84be-098cfebcc00e	1631e8f0-dc84-455d-82b8-58f239532ea4	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	30000000	VINAFOODII	vinafoodII@gmail.com	0585708374	HAY	confirmed	2026-01-21 07:36:24.722053+00	2026-01-21 07:36:24.722053+00	business
c3db0ba8-d1d6-4dbe-a17a-6e2ea15fe1e3	1631e8f0-dc84-455d-82b8-58f239532ea4	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	499725000000	VINAFOODII	vinafoodII@gmail.com	0585708374	CHÚC DỰ ÁN THÀNH CÔNG	confirmed	2026-01-21 07:41:16.107808+00	2026-01-21 07:41:16.107808+00	business
25656bec-e178-42b3-a854-c036329510e6	4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	ca24214f-9f3f-40f2-8c59-900f3124c5c8	50000000000	NAB	nab@gmail.com	03567834234	Dự án rất có tiềm năng lớn	confirmed	2026-01-23 15:28:10.221277+00	2026-01-23 15:28:10.221277+00	business
a43bc795-a8f0-4c22-9b8f-6ddcf4201e8e	4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	17bdad1d-532c-4a07-9936-669d62c8ef04	1000000	Phan Anh Tuấn	tuananh@gmail.con	0585708372	Thiết thực& khả thi	confirmed	2026-01-24 02:13:24.578292+00	2026-01-24 02:13:24.578292+00	farmer
08ce66f7-d853-4e1d-824c-b5b492769167	4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	5d100834-5494-4217-ac7c-e02053c4f016	90000000	Anh Tuấn	anhtuan@gmail.com	0585708372	Hay và khả thi	confirmed	2026-01-25 04:23:08.462545+00	2026-01-25 04:23:08.462545+00	farmer
d05b473d-cbde-435b-bf4b-7dc0d9380ff0	ede26cd1-eb56-4c6a-8d7c-005227237517	4e9dd36c-38f2-4353-a320-0c31fa3cc970	90000000000	Phan Khắc Anh Tuấn	chotuan@gmail.com	0912345678	tôi giàu oke	confirmed	2026-03-24 15:00:30.273227+00	2026-03-24 15:00:30.273227+00	farmer
bc13b1fc-c6c2-4644-9a57-6d3daf3cf308	4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	9d0ef483-3495-446e-a744-f290c1e4d509	100000000	Nguyễn Tấn Khiêm	hsntk1610@gmail.com	0819447753		confirmed	2026-03-25 10:46:45.155337+00	2026-03-25 10:46:45.155337+00	business
1e549bea-0bbf-415d-83f7-a978f88d61a3	4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	9000000	VINAFOODII	nab@gmail.com	03567834234		confirmed	2026-03-30 05:42:03.324331+00	2026-03-30 05:42:03.324331+00	farmer
\.


--
-- Data for Name: project_ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_ratings (id, project_id, user_id, rating, review, created_at, updated_at) FROM stdin;
b6f6e7ad-f8fc-408e-af90-7e0606a6a1b8	1631e8f0-dc84-455d-82b8-58f239532ea4	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	5	Hay và Khả thi trong mắt tôi	2026-01-21 07:39:59.831272+00	2026-01-21 07:42:30.486835+00
072b4682-3edd-400c-adc6-e2515db23cc6	ede26cd1-eb56-4c6a-8d7c-005227237517	4e9dd36c-38f2-4353-a320-0c31fa3cc970	5	Dự án mang lại nhiều lợi ích. Mong giúp tôi kiếm nhiều hơn.	2026-03-24 15:01:53.970048+00	2026-03-24 15:01:53.970048+00
73cb335f-4697-4657-bdb2-8774d5d000b1	4d2ea4fe-eeeb-414e-bd01-c5123842a8ec	9d0ef483-3495-446e-a744-f290c1e4d509	5	\N	2026-03-25 10:47:04.018211+00	2026-03-25 10:47:04.018211+00
\.


--
-- Data for Name: prophet_predict; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prophet_predict (id, ngay, nam, thang, tinh, ten_tram, lon, lat, du_bao_man, lower_ci, upper_ci, he_so_vi_tri, created_at) FROM stdin;
697	2027-01-01	2027	1	An Giang	Châu Đốc	105.142854	10.705307	15.41	11.94	18.77	0.85	2026-01-25 01:08:14.765899+00
698	2027-02-01	2027	2	An Giang	Châu Đốc	105.142854	10.705307	18.93	15.44	22.43	0.85	2026-01-25 01:08:14.765899+00
699	2027-03-01	2027	3	An Giang	Châu Đốc	105.142854	10.705307	22.89	19.42	26.06	0.85	2026-01-25 01:08:14.765899+00
700	2027-04-01	2027	4	An Giang	Châu Đốc	105.142854	10.705307	19.85	16.64	23.27	0.85	2026-01-25 01:08:14.765899+00
701	2027-05-01	2027	5	An Giang	Châu Đốc	105.142854	10.705307	13.19	10.03	16.46	0.85	2026-01-25 01:08:14.765899+00
702	2027-06-01	2027	6	An Giang	Châu Đốc	105.142854	10.705307	6.91	3.46	10.13	0.85	2026-01-25 01:08:14.765899+00
703	2027-07-01	2027	7	An Giang	Châu Đốc	105.142854	10.705307	3.40	0.08	6.71	0.85	2026-01-25 01:08:14.765899+00
704	2027-08-01	2027	8	An Giang	Châu Đốc	105.142854	10.705307	2.18	0.00	5.49	0.85	2026-01-25 01:08:14.765899+00
705	2027-09-01	2027	9	An Giang	Châu Đốc	105.142854	10.705307	2.18	0.00	5.63	0.85	2026-01-25 01:08:14.765899+00
706	2027-10-01	2027	10	An Giang	Châu Đốc	105.142854	10.705307	3.27	0.00	6.72	0.85	2026-01-25 01:08:14.765899+00
707	2027-11-01	2027	11	An Giang	Châu Đốc	105.142854	10.705307	6.74	3.36	10.41	0.85	2026-01-25 01:08:14.765899+00
708	2027-12-01	2027	12	An Giang	Châu Đốc	105.142854	10.705307	11.35	7.86	14.61	0.85	2026-01-25 01:08:14.765899+00
709	2028-01-01	2028	1	An Giang	Châu Đốc	105.142854	10.705307	15.30	11.78	18.74	0.85	2026-01-25 01:08:14.765899+00
710	2028-02-01	2028	2	An Giang	Châu Đốc	105.142854	10.705307	18.95	15.43	22.29	0.85	2026-01-25 01:08:14.765899+00
711	2028-03-01	2028	3	An Giang	Châu Đốc	105.142854	10.705307	22.20	18.65	25.49	0.85	2026-01-25 01:08:14.765899+00
712	2028-04-01	2028	4	An Giang	Châu Đốc	105.142854	10.705307	20.27	16.76	23.73	0.85	2026-01-25 01:08:14.765899+00
713	2028-05-01	2028	5	An Giang	Châu Đốc	105.142854	10.705307	13.05	9.54	16.40	0.85	2026-01-25 01:08:14.765899+00
714	2028-06-01	2028	6	An Giang	Châu Đốc	105.142854	10.705307	7.02	3.49	10.43	0.85	2026-01-25 01:08:14.765899+00
715	2028-07-01	2028	7	An Giang	Châu Đốc	105.142854	10.705307	3.31	0.05	6.98	0.85	2026-01-25 01:08:14.765899+00
716	2028-08-01	2028	8	An Giang	Châu Đốc	105.142854	10.705307	2.10	0.00	5.45	0.85	2026-01-25 01:08:14.765899+00
717	2028-09-01	2028	9	An Giang	Châu Đốc	105.142854	10.705307	2.05	0.00	5.31	0.85	2026-01-25 01:08:14.765899+00
718	2028-10-01	2028	10	An Giang	Châu Đốc	105.142854	10.705307	3.25	0.00	6.55	0.85	2026-01-25 01:08:14.765899+00
719	2028-11-01	2028	11	An Giang	Châu Đốc	105.142854	10.705307	6.88	3.30	10.32	0.85	2026-01-25 01:08:14.765899+00
720	2028-12-01	2028	12	An Giang	Châu Đốc	105.142854	10.705307	11.72	8.61	15.32	0.85	2026-01-25 01:08:14.765899+00
733	2027-01-01	2027	1	An Giang	Tân Châu	105.251923	10.804204	17.63	13.72	21.05	0.85	2026-01-25 01:08:14.765899+00
734	2027-02-01	2027	2	An Giang	Tân Châu	105.251923	10.804204	21.27	17.90	24.63	0.85	2026-01-25 01:08:14.765899+00
735	2027-03-01	2027	3	An Giang	Tân Châu	105.251923	10.804204	25.43	22.04	28.75	0.85	2026-01-25 01:08:14.765899+00
736	2027-04-01	2027	4	An Giang	Tân Châu	105.251923	10.804204	22.99	19.08	26.15	0.85	2026-01-25 01:08:14.765899+00
737	2027-05-01	2027	5	An Giang	Tân Châu	105.251923	10.804204	15.22	11.60	18.37	0.85	2026-01-25 01:08:14.765899+00
738	2027-06-01	2027	6	An Giang	Tân Châu	105.251923	10.804204	9.00	5.52	12.58	0.85	2026-01-25 01:08:14.765899+00
739	2027-07-01	2027	7	An Giang	Tân Châu	105.251923	10.804204	5.31	1.66	8.56	0.85	2026-01-25 01:08:14.765899+00
740	2027-08-01	2027	8	An Giang	Tân Châu	105.251923	10.804204	4.12	0.58	7.66	0.85	2026-01-25 01:08:14.765899+00
741	2027-09-01	2027	9	An Giang	Tân Châu	105.251923	10.804204	4.17	0.84	7.72	0.85	2026-01-25 01:08:14.765899+00
742	2027-10-01	2027	10	An Giang	Tân Châu	105.251923	10.804204	5.30	1.63	9.01	0.85	2026-01-25 01:08:14.765899+00
743	2027-11-01	2027	11	An Giang	Tân Châu	105.251923	10.804204	9.00	5.18	12.41	0.85	2026-01-25 01:08:14.765899+00
744	2027-12-01	2027	12	An Giang	Tân Châu	105.251923	10.804204	13.91	10.18	17.68	0.85	2026-01-25 01:08:14.765899+00
745	2028-01-01	2028	1	An Giang	Tân Châu	105.251923	10.804204	17.96	14.14	21.46	0.85	2026-01-25 01:08:14.765899+00
746	2028-02-01	2028	2	An Giang	Tân Châu	105.251923	10.804204	21.49	17.89	25.10	0.85	2026-01-25 01:08:14.765899+00
747	2028-03-01	2028	3	An Giang	Tân Châu	105.251923	10.804204	25.40	21.67	28.83	0.85	2026-01-25 01:08:14.765899+00
748	2028-04-01	2028	4	An Giang	Tân Châu	105.251923	10.804204	22.90	19.33	26.48	0.85	2026-01-25 01:08:14.765899+00
749	2028-05-01	2028	5	An Giang	Tân Châu	105.251923	10.804204	15.81	12.18	19.24	0.85	2026-01-25 01:08:14.765899+00
750	2028-06-01	2028	6	An Giang	Tân Châu	105.251923	10.804204	9.40	5.80	12.74	0.85	2026-01-25 01:08:14.765899+00
751	2028-07-01	2028	7	An Giang	Tân Châu	105.251923	10.804204	5.76	2.23	9.39	0.85	2026-01-25 01:08:14.765899+00
752	2028-08-01	2028	8	An Giang	Tân Châu	105.251923	10.804204	4.49	0.79	8.09	0.85	2026-01-25 01:08:14.765899+00
753	2028-09-01	2028	9	An Giang	Tân Châu	105.251923	10.804204	4.48	0.60	7.99	0.85	2026-01-25 01:08:14.765899+00
754	2028-10-01	2028	10	An Giang	Tân Châu	105.251923	10.804204	5.76	2.15	9.09	0.85	2026-01-25 01:08:14.765899+00
755	2028-11-01	2028	11	An Giang	Tân Châu	105.251923	10.804204	9.49	5.77	12.91	0.85	2026-01-25 01:08:14.765899+00
756	2028-12-01	2028	12	An Giang	Tân Châu	105.251923	10.804204	14.34	10.52	18.03	0.85	2026-01-25 01:08:14.765899+00
344	2026-08-01	2026	8	An Giang	Vàm Nao	105.363475	10.579197	0.78	0.00	3.35	0.85	2026-01-24 15:31:24.572065+00
345	2026-09-01	2026	9	An Giang	Vàm Nao	105.363475	10.579197	0.80	0.00	3.41	0.85	2026-01-24 15:31:24.572065+00
346	2026-10-01	2026	10	An Giang	Vàm Nao	105.363475	10.579197	1.79	0.00	4.28	0.85	2026-01-24 15:31:24.572065+00
347	2026-11-01	2026	11	An Giang	Vàm Nao	105.363475	10.579197	4.61	2.17	7.35	0.85	2026-01-24 15:31:24.572065+00
348	2026-12-01	2026	12	An Giang	Vàm Nao	105.363475	10.579197	8.32	5.67	10.84	0.85	2026-01-24 15:31:24.572065+00
769	2027-01-01	2027	1	An Giang	Vàm Nao	105.363475	10.579197	10.73	8.11	13.32	0.85	2026-01-25 01:08:14.765899+00
770	2027-02-01	2027	2	An Giang	Vàm Nao	105.363475	10.579197	13.41	10.76	15.62	0.85	2026-01-25 01:08:14.765899+00
771	2027-03-01	2027	3	An Giang	Vàm Nao	105.363475	10.579197	17.05	14.48	19.45	0.85	2026-01-25 01:08:14.765899+00
772	2027-04-01	2027	4	An Giang	Vàm Nao	105.363475	10.579197	15.18	12.68	17.67	0.85	2026-01-25 01:08:14.765899+00
773	2027-05-01	2027	5	An Giang	Vàm Nao	105.363475	10.579197	9.26	6.74	11.97	0.85	2026-01-25 01:08:14.765899+00
774	2027-06-01	2027	6	An Giang	Vàm Nao	105.363475	10.579197	4.19	1.78	6.88	0.85	2026-01-25 01:08:14.765899+00
775	2027-07-01	2027	7	An Giang	Vàm Nao	105.363475	10.579197	1.27	0.00	3.82	0.85	2026-01-25 01:08:14.765899+00
776	2027-08-01	2027	8	An Giang	Vàm Nao	105.363475	10.579197	0.49	0.00	2.95	0.85	2026-01-25 01:08:14.765899+00
777	2027-09-01	2027	9	An Giang	Vàm Nao	105.363475	10.579197	0.61	0.00	3.19	0.85	2026-01-25 01:08:14.765899+00
778	2027-10-01	2027	10	An Giang	Vàm Nao	105.363475	10.579197	1.71	0.00	4.36	0.85	2026-01-25 01:08:14.765899+00
779	2027-11-01	2027	11	An Giang	Vàm Nao	105.363475	10.579197	4.60	2.06	7.31	0.85	2026-01-25 01:08:14.765899+00
780	2027-12-01	2027	12	An Giang	Vàm Nao	105.363475	10.579197	8.41	5.73	10.97	0.85	2026-01-25 01:08:14.765899+00
781	2028-01-01	2028	1	An Giang	Vàm Nao	105.363475	10.579197	10.17	7.52	12.63	0.85	2026-01-25 01:08:14.765899+00
782	2028-02-01	2028	2	An Giang	Vàm Nao	105.363475	10.579197	12.63	10.13	15.25	0.85	2026-01-25 01:08:14.765899+00
783	2028-03-01	2028	3	An Giang	Vàm Nao	105.363475	10.579197	15.82	13.18	18.39	0.85	2026-01-25 01:08:14.765899+00
784	2028-04-01	2028	4	An Giang	Vàm Nao	105.363475	10.579197	13.80	11.33	16.42	0.85	2026-01-25 01:08:14.765899+00
785	2028-05-01	2028	5	An Giang	Vàm Nao	105.363475	10.579197	8.70	6.21	11.36	0.85	2026-01-25 01:08:14.765899+00
786	2028-06-01	2028	6	An Giang	Vàm Nao	105.363475	10.579197	4.49	2.12	6.99	0.85	2026-01-25 01:08:14.765899+00
787	2028-07-01	2028	7	An Giang	Vàm Nao	105.363475	10.579197	1.68	0.00	4.38	0.85	2026-01-25 01:08:14.765899+00
788	2028-08-01	2028	8	An Giang	Vàm Nao	105.363475	10.579197	0.64	0.00	3.22	0.85	2026-01-25 01:08:14.765899+00
789	2028-09-01	2028	9	An Giang	Vàm Nao	105.363475	10.579197	0.49	0.00	3.21	0.85	2026-01-25 01:08:14.765899+00
790	2028-10-01	2028	10	An Giang	Vàm Nao	105.363475	10.579197	1.26	0.00	3.84	0.85	2026-01-25 01:08:14.765899+00
791	2028-11-01	2028	11	An Giang	Vàm Nao	105.363475	10.579197	3.92	1.12	6.49	0.85	2026-01-25 01:08:14.765899+00
792	2028-12-01	2028	12	An Giang	Vàm Nao	105.363475	10.579197	7.40	4.72	9.88	0.85	2026-01-25 01:08:14.765899+00
349	2026-01-01	2026	1	An Giang	Xuân Tô	104.948078	10.607973	1.31	1.03	1.61	0.85	2026-01-24 15:31:24.572065+00
350	2026-02-01	2026	2	An Giang	Xuân Tô	104.948078	10.607973	1.55	1.26	1.85	0.85	2026-01-24 15:31:24.572065+00
351	2026-03-01	2026	3	An Giang	Xuân Tô	104.948078	10.607973	1.80	1.54	2.08	0.85	2026-01-24 15:31:24.572065+00
352	2026-04-01	2026	4	An Giang	Xuân Tô	104.948078	10.607973	1.65	1.36	1.95	0.85	2026-01-24 15:31:24.572065+00
353	2026-05-01	2026	5	An Giang	Xuân Tô	104.948078	10.607973	1.15	0.84	1.42	0.85	2026-01-24 15:31:24.572065+00
354	2026-06-01	2026	6	An Giang	Xuân Tô	104.948078	10.607973	0.76	0.47	1.04	0.85	2026-01-24 15:31:24.572065+00
355	2026-07-01	2026	7	An Giang	Xuân Tô	104.948078	10.607973	0.51	0.21	0.80	0.85	2026-01-24 15:31:24.572065+00
356	2026-08-01	2026	8	An Giang	Xuân Tô	104.948078	10.607973	0.43	0.14	0.74	0.85	2026-01-24 15:31:24.572065+00
357	2026-09-01	2026	9	An Giang	Xuân Tô	104.948078	10.607973	0.44	0.14	0.74	0.85	2026-01-24 15:31:24.572065+00
358	2026-10-01	2026	10	An Giang	Xuân Tô	104.948078	10.607973	0.52	0.23	0.83	0.85	2026-01-24 15:31:24.572065+00
359	2026-11-01	2026	11	An Giang	Xuân Tô	104.948078	10.607973	0.77	0.49	1.07	0.85	2026-01-24 15:31:24.572065+00
360	2026-12-01	2026	12	An Giang	Xuân Tô	104.948078	10.607973	1.10	0.79	1.39	0.85	2026-01-24 15:31:24.572065+00
805	2027-01-01	2027	1	An Giang	Xuân Tô	104.948078	10.607973	1.39	1.10	1.67	0.85	2026-01-25 01:08:14.765899+00
806	2027-02-01	2027	2	An Giang	Xuân Tô	104.948078	10.607973	1.63	1.33	1.92	0.85	2026-01-25 01:08:14.765899+00
807	2027-03-01	2027	3	An Giang	Xuân Tô	104.948078	10.607973	1.88	1.57	2.17	0.85	2026-01-25 01:08:14.765899+00
808	2027-04-01	2027	4	An Giang	Xuân Tô	104.948078	10.607973	1.71	1.43	2.02	0.85	2026-01-25 01:08:14.765899+00
809	2027-05-01	2027	5	An Giang	Xuân Tô	104.948078	10.607973	1.23	0.90	1.53	0.85	2026-01-25 01:08:14.765899+00
810	2027-06-01	2027	6	An Giang	Xuân Tô	104.948078	10.607973	0.84	0.56	1.14	0.85	2026-01-25 01:08:14.765899+00
811	2027-07-01	2027	7	An Giang	Xuân Tô	104.948078	10.607973	0.60	0.30	0.90	0.85	2026-01-25 01:08:14.765899+00
812	2027-08-01	2027	8	An Giang	Xuân Tô	104.948078	10.607973	0.51	0.19	0.80	0.85	2026-01-25 01:08:14.765899+00
813	2027-09-01	2027	9	An Giang	Xuân Tô	104.948078	10.607973	0.51	0.21	0.80	0.85	2026-01-25 01:08:14.765899+00
814	2027-10-01	2027	10	An Giang	Xuân Tô	104.948078	10.607973	0.60	0.28	0.89	0.85	2026-01-25 01:08:14.765899+00
815	2027-11-01	2027	11	An Giang	Xuân Tô	104.948078	10.607973	0.84	0.55	1.13	0.85	2026-01-25 01:08:14.765899+00
816	2027-12-01	2027	12	An Giang	Xuân Tô	104.948078	10.607973	1.17	0.86	1.48	0.85	2026-01-25 01:08:14.765899+00
817	2028-01-01	2028	1	An Giang	Xuân Tô	104.948078	10.607973	1.40	1.11	1.71	0.85	2026-01-25 01:08:14.765899+00
818	2028-02-01	2028	2	An Giang	Xuân Tô	104.948078	10.607973	1.63	1.33	1.95	0.85	2026-01-25 01:08:14.765899+00
819	2028-03-01	2028	3	An Giang	Xuân Tô	104.948078	10.607973	1.87	1.56	2.18	0.85	2026-01-25 01:08:14.765899+00
820	2028-04-01	2028	4	An Giang	Xuân Tô	104.948078	10.607973	1.74	1.43	2.06	0.85	2026-01-25 01:08:14.765899+00
821	2028-05-01	2028	5	An Giang	Xuân Tô	104.948078	10.607973	1.21	0.89	1.53	0.85	2026-01-25 01:08:14.765899+00
822	2028-06-01	2028	6	An Giang	Xuân Tô	104.948078	10.607973	0.82	0.51	1.14	0.85	2026-01-25 01:08:14.765899+00
823	2028-07-01	2028	7	An Giang	Xuân Tô	104.948078	10.607973	0.57	0.24	0.88	0.85	2026-01-25 01:08:14.765899+00
824	2028-08-01	2028	8	An Giang	Xuân Tô	104.948078	10.607973	0.51	0.18	0.81	0.85	2026-01-25 01:08:14.765899+00
825	2028-09-01	2028	9	An Giang	Xuân Tô	104.948078	10.607973	0.52	0.21	0.83	0.85	2026-01-25 01:08:14.765899+00
826	2028-10-01	2028	10	An Giang	Xuân Tô	104.948078	10.607973	0.60	0.29	0.91	0.85	2026-01-25 01:08:14.765899+00
827	2028-11-01	2028	11	An Giang	Xuân Tô	104.948078	10.607973	0.86	0.54	1.18	0.85	2026-01-25 01:08:14.765899+00
828	2028-12-01	2028	12	An Giang	Xuân Tô	104.948078	10.607973	1.19	0.86	1.50	0.85	2026-01-25 01:08:14.765899+00
25	2026-01-01	2026	1	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.16	0.92	1.39	1.49	2026-01-24 13:09:14.587614+00
26	2026-02-01	2026	2	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.53	1.28	1.78	1.49	2026-01-24 13:09:14.587614+00
27	2026-03-01	2026	3	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.93	1.70	2.18	1.49	2026-01-24 13:09:14.587614+00
28	2026-04-01	2026	4	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.67	1.42	1.92	1.49	2026-01-24 13:09:14.587614+00
29	2026-05-01	2026	5	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.87	0.64	1.12	1.49	2026-01-24 13:09:14.587614+00
30	2026-06-01	2026	6	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.20	0.00	0.44	1.49	2026-01-24 13:09:14.587614+00
31	2026-07-01	2026	7	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	0.05	1.49	2026-01-24 13:09:14.587614+00
32	2026-08-01	2026	8	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.07	1.49	2026-01-24 13:09:14.587614+00
33	2026-09-01	2026	9	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.08	1.49	2026-01-24 13:09:14.587614+00
34	2026-10-01	2026	10	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	0.04	1.49	2026-01-24 13:09:14.587614+00
35	2026-11-01	2026	11	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.20	0.00	0.46	1.49	2026-01-24 13:09:14.587614+00
36	2026-12-01	2026	12	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.74	0.51	0.97	1.49	2026-01-24 13:09:14.587614+00
841	2027-01-01	2027	1	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.06	0.81	1.29	1.49	2026-01-25 01:08:14.765899+00
842	2027-02-01	2027	2	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.43	1.20	1.66	1.49	2026-01-25 01:08:14.765899+00
843	2027-03-01	2027	3	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.88	1.64	2.12	1.49	2026-01-25 01:08:14.765899+00
844	2027-04-01	2027	4	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.62	1.37	1.86	1.49	2026-01-25 01:08:14.765899+00
845	2027-05-01	2027	5	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.82	0.58	1.08	1.49	2026-01-25 01:08:14.765899+00
846	2027-06-01	2027	6	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.14	0.00	0.38	1.49	2026-01-25 01:08:14.765899+00
847	2027-07-01	2027	7	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.03	1.49	2026-01-25 01:08:14.765899+00
848	2027-08-01	2027	8	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.15	1.49	2026-01-25 01:08:14.765899+00
849	2027-09-01	2027	9	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.16	1.49	2026-01-25 01:08:14.765899+00
850	2027-10-01	2027	10	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.01	1.49	2026-01-25 01:08:14.765899+00
851	2027-11-01	2027	11	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.14	0.00	0.40	1.49	2026-01-25 01:08:14.765899+00
852	2027-12-01	2027	12	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.69	0.44	0.91	1.49	2026-01-25 01:08:14.765899+00
853	2028-01-01	2028	1	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.01	0.77	1.25	1.49	2026-01-25 01:08:14.765899+00
854	2028-02-01	2028	2	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.38	1.13	1.63	1.49	2026-01-25 01:08:14.765899+00
855	2028-03-01	2028	3	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.81	1.56	2.05	1.49	2026-01-25 01:08:14.765899+00
856	2028-04-01	2028	4	Bạc Liêu	Chủ Chí	105.317825	9.303516	1.55	1.32	1.80	1.49	2026-01-25 01:08:14.765899+00
857	2028-05-01	2028	5	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.76	0.53	1.01	1.49	2026-01-25 01:08:14.765899+00
858	2028-06-01	2028	6	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.10	0.00	0.35	1.49	2026-01-25 01:08:14.765899+00
859	2028-07-01	2028	7	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.03	1.49	2026-01-25 01:08:14.765899+00
860	2028-08-01	2028	8	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.16	1.49	2026-01-25 01:08:14.765899+00
861	2028-09-01	2028	9	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.15	1.49	2026-01-25 01:08:14.765899+00
862	2028-10-01	2028	10	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.00	0.00	-0.05	1.49	2026-01-25 01:08:14.765899+00
863	2028-11-01	2028	11	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.09	0.00	0.33	1.49	2026-01-25 01:08:14.765899+00
864	2028-12-01	2028	12	Bạc Liêu	Chủ Chí	105.317825	9.303516	0.60	0.37	0.84	1.49	2026-01-25 01:08:14.765899+00
37	2026-01-01	2026	1	Bạc Liêu	Gành Hào	105.426389	9.041389	8.57	6.16	11.41	1.49	2026-01-24 13:09:14.587614+00
38	2026-02-01	2026	2	Bạc Liêu	Gành Hào	105.426389	9.041389	10.60	7.88	13.21	1.49	2026-01-24 13:09:14.587614+00
39	2026-03-01	2026	3	Bạc Liêu	Gành Hào	105.426389	9.041389	12.61	10.06	15.32	1.49	2026-01-24 13:09:14.587614+00
40	2026-04-01	2026	4	Bạc Liêu	Gành Hào	105.426389	9.041389	11.01	8.39	13.70	1.49	2026-01-24 13:09:14.587614+00
41	2026-05-01	2026	5	Bạc Liêu	Gành Hào	105.426389	9.041389	7.11	4.37	9.63	1.49	2026-01-24 13:09:14.587614+00
42	2026-06-01	2026	6	Bạc Liêu	Gành Hào	105.426389	9.041389	3.75	1.16	6.33	1.49	2026-01-24 13:09:14.587614+00
43	2026-07-01	2026	7	Bạc Liêu	Gành Hào	105.426389	9.041389	1.70	0.00	4.20	1.49	2026-01-24 13:09:14.587614+00
44	2026-08-01	2026	8	Bạc Liêu	Gành Hào	105.426389	9.041389	1.02	0.00	3.62	1.49	2026-01-24 13:09:14.587614+00
45	2026-09-01	2026	9	Bạc Liêu	Gành Hào	105.426389	9.041389	1.01	0.00	3.54	1.49	2026-01-24 13:09:14.587614+00
46	2026-10-01	2026	10	Bạc Liêu	Gành Hào	105.426389	9.041389	1.64	0.00	4.29	1.49	2026-01-24 13:09:14.587614+00
47	2026-11-01	2026	11	Bạc Liêu	Gành Hào	105.426389	9.041389	3.60	1.00	6.41	1.49	2026-01-24 13:09:14.587614+00
48	2026-12-01	2026	12	Bạc Liêu	Gành Hào	105.426389	9.041389	6.17	3.71	8.78	1.49	2026-01-24 13:09:14.587614+00
877	2027-01-01	2027	1	Bạc Liêu	Gành Hào	105.426389	9.041389	8.49	5.96	11.10	1.49	2026-01-25 01:08:14.765899+00
878	2027-02-01	2027	2	Bạc Liêu	Gành Hào	105.426389	9.041389	10.38	7.75	13.14	1.49	2026-01-25 01:08:14.765899+00
879	2027-03-01	2027	3	Bạc Liêu	Gành Hào	105.426389	9.041389	12.85	10.43	15.32	1.49	2026-01-25 01:08:14.765899+00
880	2027-04-01	2027	4	Bạc Liêu	Gành Hào	105.426389	9.041389	11.20	8.48	13.76	1.49	2026-01-25 01:08:14.765899+00
881	2027-05-01	2027	5	Bạc Liêu	Gành Hào	105.426389	9.041389	7.22	4.60	9.95	1.49	2026-01-25 01:08:14.765899+00
882	2027-06-01	2027	6	Bạc Liêu	Gành Hào	105.426389	9.041389	3.78	1.02	6.23	1.49	2026-01-25 01:08:14.765899+00
883	2027-07-01	2027	7	Bạc Liêu	Gành Hào	105.426389	9.041389	1.70	0.00	4.30	1.49	2026-01-25 01:08:14.765899+00
884	2027-08-01	2027	8	Bạc Liêu	Gành Hào	105.426389	9.041389	1.03	0.00	3.50	1.49	2026-01-25 01:08:14.765899+00
885	2027-09-01	2027	9	Bạc Liêu	Gành Hào	105.426389	9.041389	1.06	0.00	3.65	1.49	2026-01-25 01:08:14.765899+00
886	2027-10-01	2027	10	Bạc Liêu	Gành Hào	105.426389	9.041389	1.73	0.00	4.55	1.49	2026-01-25 01:08:14.765899+00
887	2027-11-01	2027	11	Bạc Liêu	Gành Hào	105.426389	9.041389	3.74	1.28	6.27	1.49	2026-01-25 01:08:14.765899+00
888	2027-12-01	2027	12	Bạc Liêu	Gành Hào	105.426389	9.041389	6.29	3.85	8.88	1.49	2026-01-25 01:08:14.765899+00
889	2028-01-01	2028	1	Bạc Liêu	Gành Hào	105.426389	9.041389	7.56	4.95	10.04	1.49	2026-01-25 01:08:14.765899+00
890	2028-02-01	2028	2	Bạc Liêu	Gành Hào	105.426389	9.041389	9.31	6.60	11.79	1.49	2026-01-25 01:08:14.765899+00
891	2028-03-01	2028	3	Bạc Liêu	Gành Hào	105.426389	9.041389	11.53	9.05	14.13	1.49	2026-01-25 01:08:14.765899+00
892	2028-04-01	2028	4	Bạc Liêu	Gành Hào	105.426389	9.041389	10.01	7.27	12.67	1.49	2026-01-25 01:08:14.765899+00
893	2028-05-01	2028	5	Bạc Liêu	Gành Hào	105.426389	9.041389	6.25	3.72	8.90	1.49	2026-01-25 01:08:14.765899+00
894	2028-06-01	2028	6	Bạc Liêu	Gành Hào	105.426389	9.041389	3.06	0.51	5.56	1.49	2026-01-25 01:08:14.765899+00
895	2028-07-01	2028	7	Bạc Liêu	Gành Hào	105.426389	9.041389	1.07	0.00	3.73	1.49	2026-01-25 01:08:14.765899+00
896	2028-08-01	2028	8	Bạc Liêu	Gành Hào	105.426389	9.041389	0.38	0.00	2.85	1.49	2026-01-25 01:08:14.765899+00
897	2028-09-01	2028	9	Bạc Liêu	Gành Hào	105.426389	9.041389	0.29	0.00	2.96	1.49	2026-01-25 01:08:14.765899+00
898	2028-10-01	2028	10	Bạc Liêu	Gành Hào	105.426389	9.041389	0.85	0.00	3.50	1.49	2026-01-25 01:08:14.765899+00
899	2028-11-01	2028	11	Bạc Liêu	Gành Hào	105.426389	9.041389	2.69	0.00	5.26	1.49	2026-01-25 01:08:14.765899+00
900	2028-12-01	2028	12	Bạc Liêu	Gành Hào	105.426389	9.041389	5.28	2.70	7.84	1.49	2026-01-25 01:08:14.765899+00
49	2026-01-01	2026	1	Bến Tre	An Thuận	106.539769	9.919397	0.85	0.00	2.22	1.37	2026-01-24 13:09:14.587614+00
50	2026-02-01	2026	2	Bến Tre	An Thuận	106.539769	9.919397	1.48	0.17	2.75	1.37	2026-01-24 13:09:14.587614+00
51	2026-03-01	2026	3	Bến Tre	An Thuận	106.539769	9.919397	2.16	0.75	3.42	1.37	2026-01-24 13:09:14.587614+00
52	2026-04-01	2026	4	Bến Tre	An Thuận	106.539769	9.919397	1.74	0.40	3.22	1.37	2026-01-24 13:09:14.587614+00
53	2026-05-01	2026	5	Bến Tre	An Thuận	106.539769	9.919397	0.50	0.00	1.88	1.37	2026-01-24 13:09:14.587614+00
54	2026-06-01	2026	6	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.89	1.37	2026-01-24 13:09:14.587614+00
55	2026-07-01	2026	7	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.27	1.37	2026-01-24 13:09:14.587614+00
56	2026-08-01	2026	8	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	-0.03	1.37	2026-01-24 13:09:14.587614+00
57	2026-09-01	2026	9	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	-0.04	1.37	2026-01-24 13:09:14.587614+00
58	2026-10-01	2026	10	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.12	1.37	2026-01-24 13:09:14.587614+00
59	2026-11-01	2026	11	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.79	1.37	2026-01-24 13:09:14.587614+00
60	2026-12-01	2026	12	Bến Tre	An Thuận	106.539769	9.919397	0.26	0.00	1.63	1.37	2026-01-24 13:09:14.587614+00
913	2027-01-01	2027	1	Bến Tre	An Thuận	106.539769	9.919397	0.87	0.00	2.16	1.37	2026-01-25 01:08:14.765899+00
914	2027-02-01	2027	2	Bến Tre	An Thuận	106.539769	9.919397	1.64	0.34	3.07	1.37	2026-01-25 01:08:14.765899+00
915	2027-03-01	2027	3	Bến Tre	An Thuận	106.539769	9.919397	2.02	0.65	3.37	1.37	2026-01-25 01:08:14.765899+00
916	2027-04-01	2027	4	Bến Tre	An Thuận	106.539769	9.919397	1.58	0.25	2.83	1.37	2026-01-25 01:08:14.765899+00
917	2027-05-01	2027	5	Bến Tre	An Thuận	106.539769	9.919397	0.47	0.00	1.73	1.37	2026-01-25 01:08:14.765899+00
918	2027-06-01	2027	6	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.90	1.37	2026-01-25 01:08:14.765899+00
919	2027-07-01	2027	7	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.19	1.37	2026-01-25 01:08:14.765899+00
920	2027-08-01	2027	8	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.06	1.37	2026-01-25 01:08:14.765899+00
921	2027-09-01	2027	9	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	-0.16	1.37	2026-01-25 01:08:14.765899+00
922	2027-10-01	2027	10	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.07	1.37	2026-01-25 01:08:14.765899+00
923	2027-11-01	2027	11	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.77	1.37	2026-01-25 01:08:14.765899+00
924	2027-12-01	2027	12	Bến Tre	An Thuận	106.539769	9.919397	0.12	0.00	1.52	1.37	2026-01-25 01:08:14.765899+00
925	2028-01-01	2028	1	Bến Tre	An Thuận	106.539769	9.919397	0.69	0.00	2.03	1.37	2026-01-25 01:08:14.765899+00
926	2028-02-01	2028	2	Bến Tre	An Thuận	106.539769	9.919397	1.59	0.18	2.96	1.37	2026-01-25 01:08:14.765899+00
927	2028-03-01	2028	3	Bến Tre	An Thuận	106.539769	9.919397	2.07	0.70	3.40	1.37	2026-01-25 01:08:14.765899+00
928	2028-04-01	2028	4	Bến Tre	An Thuận	106.539769	9.919397	1.72	0.44	3.02	1.37	2026-01-25 01:08:14.765899+00
929	2028-05-01	2028	5	Bến Tre	An Thuận	106.539769	9.919397	0.21	0.00	1.61	1.37	2026-01-25 01:08:14.765899+00
930	2028-06-01	2028	6	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.40	1.37	2026-01-25 01:08:14.765899+00
931	2028-07-01	2028	7	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	-0.34	1.37	2026-01-25 01:08:14.765899+00
932	2028-08-01	2028	8	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	-0.39	1.37	2026-01-25 01:08:14.765899+00
933	2028-09-01	2028	9	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	-0.29	1.37	2026-01-25 01:08:14.765899+00
934	2028-10-01	2028	10	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	-0.15	1.37	2026-01-25 01:08:14.765899+00
935	2028-11-01	2028	11	Bến Tre	An Thuận	106.539769	9.919397	0.00	0.00	0.55	1.37	2026-01-25 01:08:14.765899+00
936	2028-12-01	2028	12	Bến Tre	An Thuận	106.539769	9.919397	0.18	0.00	1.48	1.37	2026-01-25 01:08:14.765899+00
61	2026-01-01	2026	1	Bến Tre	Bình Đại	106.701726	10.178485	3.57	2.27	4.92	1.30	2026-01-24 13:09:14.587614+00
62	2026-02-01	2026	2	Bến Tre	Bình Đại	106.701726	10.178485	4.53	3.24	5.93	1.30	2026-01-24 13:09:14.587614+00
63	2026-03-01	2026	3	Bến Tre	Bình Đại	106.701726	10.178485	5.36	4.01	6.76	1.30	2026-01-24 13:09:14.587614+00
64	2026-04-01	2026	4	Bến Tre	Bình Đại	106.701726	10.178485	4.78	3.36	6.12	1.30	2026-01-24 13:09:14.587614+00
65	2026-05-01	2026	5	Bến Tre	Bình Đại	106.701726	10.178485	3.08	1.65	4.53	1.30	2026-01-24 13:09:14.587614+00
66	2026-06-01	2026	6	Bến Tre	Bình Đại	106.701726	10.178485	1.56	0.20	2.85	1.30	2026-01-24 13:09:14.587614+00
67	2026-07-01	2026	7	Bến Tre	Bình Đại	106.701726	10.178485	0.68	0.00	2.07	1.30	2026-01-24 13:09:14.587614+00
68	2026-08-01	2026	8	Bến Tre	Bình Đại	106.701726	10.178485	0.39	0.00	1.65	1.30	2026-01-24 13:09:14.587614+00
69	2026-09-01	2026	9	Bến Tre	Bình Đại	106.701726	10.178485	0.40	0.00	1.80	1.30	2026-01-24 13:09:14.587614+00
70	2026-10-01	2026	10	Bến Tre	Bình Đại	106.701726	10.178485	0.70	0.00	2.12	1.30	2026-01-24 13:09:14.587614+00
71	2026-11-01	2026	11	Bến Tre	Bình Đại	106.701726	10.178485	1.57	0.23	3.02	1.30	2026-01-24 13:09:14.587614+00
72	2026-12-01	2026	12	Bến Tre	Bình Đại	106.701726	10.178485	2.79	1.38	4.19	1.30	2026-01-24 13:09:14.587614+00
949	2027-01-01	2027	1	Bến Tre	Bình Đại	106.701726	10.178485	3.71	2.27	5.01	1.30	2026-01-25 01:08:14.765899+00
950	2027-02-01	2027	2	Bến Tre	Bình Đại	106.701726	10.178485	4.65	3.37	6.07	1.30	2026-01-25 01:08:14.765899+00
951	2027-03-01	2027	3	Bến Tre	Bình Đại	106.701726	10.178485	5.59	4.25	6.99	1.30	2026-01-25 01:08:14.765899+00
952	2027-04-01	2027	4	Bến Tre	Bình Đại	106.701726	10.178485	4.98	3.64	6.20	1.30	2026-01-25 01:08:14.765899+00
953	2027-05-01	2027	5	Bến Tre	Bình Đại	106.701726	10.178485	3.27	2.00	4.73	1.30	2026-01-25 01:08:14.765899+00
954	2027-06-01	2027	6	Bến Tre	Bình Đại	106.701726	10.178485	1.74	0.36	3.13	1.30	2026-01-25 01:08:14.765899+00
955	2027-07-01	2027	7	Bến Tre	Bình Đại	106.701726	10.178485	0.85	0.00	2.23	1.30	2026-01-25 01:08:14.765899+00
956	2027-08-01	2027	8	Bến Tre	Bình Đại	106.701726	10.178485	0.57	0.00	1.95	1.30	2026-01-25 01:08:14.765899+00
957	2027-09-01	2027	9	Bến Tre	Bình Đại	106.701726	10.178485	0.57	0.00	1.93	1.30	2026-01-25 01:08:14.765899+00
958	2027-10-01	2027	10	Bến Tre	Bình Đại	106.701726	10.178485	0.88	0.00	2.39	1.30	2026-01-25 01:08:14.765899+00
959	2027-11-01	2027	11	Bến Tre	Bình Đại	106.701726	10.178485	1.76	0.38	3.13	1.30	2026-01-25 01:08:14.765899+00
960	2027-12-01	2027	12	Bến Tre	Bình Đại	106.701726	10.178485	2.98	1.70	4.33	1.30	2026-01-25 01:08:14.765899+00
961	2028-01-01	2028	1	Bến Tre	Bình Đại	106.701726	10.178485	3.48	2.12	4.87	1.30	2026-01-25 01:08:14.765899+00
962	2028-02-01	2028	2	Bến Tre	Bình Đại	106.701726	10.178485	4.41	3.13	5.79	1.30	2026-01-25 01:08:14.765899+00
963	2028-03-01	2028	3	Bến Tre	Bình Đại	106.701726	10.178485	5.26	3.91	6.71	1.30	2026-01-25 01:08:14.765899+00
964	2028-04-01	2028	4	Bến Tre	Bình Đại	106.701726	10.178485	4.73	3.31	6.12	1.30	2026-01-25 01:08:14.765899+00
965	2028-05-01	2028	5	Bến Tre	Bình Đại	106.701726	10.178485	3.05	1.70	4.49	1.30	2026-01-25 01:08:14.765899+00
966	2028-06-01	2028	6	Bến Tre	Bình Đại	106.701726	10.178485	1.55	0.18	2.95	1.30	2026-01-25 01:08:14.765899+00
967	2028-07-01	2028	7	Bến Tre	Bình Đại	106.701726	10.178485	0.68	0.00	2.08	1.30	2026-01-25 01:08:14.765899+00
968	2028-08-01	2028	8	Bến Tre	Bình Đại	106.701726	10.178485	0.40	0.00	1.74	1.30	2026-01-25 01:08:14.765899+00
969	2028-09-01	2028	9	Bến Tre	Bình Đại	106.701726	10.178485	0.40	0.00	1.81	1.30	2026-01-25 01:08:14.765899+00
970	2028-10-01	2028	10	Bến Tre	Bình Đại	106.701726	10.178485	0.70	0.00	2.09	1.30	2026-01-25 01:08:14.765899+00
971	2028-11-01	2028	11	Bến Tre	Bình Đại	106.701726	10.178485	1.55	0.16	2.96	1.30	2026-01-25 01:08:14.765899+00
972	2028-12-01	2028	12	Bến Tre	Bình Đại	106.701726	10.178485	2.75	1.42	4.14	1.30	2026-01-25 01:08:14.765899+00
409	2026-01-01	2026	1	Bến Tre	Chợ Lách	106.126268	10.279341	16.85	14.09	19.88	1.30	2026-01-24 15:31:24.572065+00
410	2026-02-01	2026	2	Bến Tre	Chợ Lách	106.126268	10.279341	20.25	17.13	22.98	1.30	2026-01-24 15:31:24.572065+00
411	2026-03-01	2026	3	Bến Tre	Chợ Lách	106.126268	10.279341	23.76	20.76	26.84	1.30	2026-01-24 15:31:24.572065+00
412	2026-04-01	2026	4	Bến Tre	Chợ Lách	106.126268	10.279341	21.04	18.16	24.09	1.30	2026-01-24 15:31:24.572065+00
413	2026-05-01	2026	5	Bến Tre	Chợ Lách	106.126268	10.279341	14.67	11.55	17.86	1.30	2026-01-24 15:31:24.572065+00
414	2026-06-01	2026	6	Bến Tre	Chợ Lách	106.126268	10.279341	8.83	5.88	12.00	1.30	2026-01-24 15:31:24.572065+00
415	2026-07-01	2026	7	Bến Tre	Chợ Lách	106.126268	10.279341	5.45	2.28	8.22	1.30	2026-01-24 15:31:24.572065+00
416	2026-08-01	2026	8	Bến Tre	Chợ Lách	106.126268	10.279341	4.34	1.45	7.19	1.30	2026-01-24 15:31:24.572065+00
417	2026-09-01	2026	9	Bến Tre	Chợ Lách	106.126268	10.279341	4.34	1.46	7.50	1.30	2026-01-24 15:31:24.572065+00
418	2026-10-01	2026	10	Bến Tre	Chợ Lách	106.126268	10.279341	5.47	2.72	8.46	1.30	2026-01-24 15:31:24.572065+00
419	2026-11-01	2026	11	Bến Tre	Chợ Lách	106.126268	10.279341	8.84	5.92	11.75	1.30	2026-01-24 15:31:24.572065+00
420	2026-12-01	2026	12	Bến Tre	Chợ Lách	106.126268	10.279341	13.26	10.40	15.89	1.30	2026-01-24 15:31:24.572065+00
985	2027-01-01	2027	1	Bến Tre	Chợ Lách	106.126268	10.279341	16.97	14.15	20.12	1.30	2026-01-25 01:08:14.765899+00
986	2027-02-01	2027	2	Bến Tre	Chợ Lách	106.126268	10.279341	20.12	17.23	23.02	1.30	2026-01-25 01:08:14.765899+00
987	2027-03-01	2027	3	Bến Tre	Chợ Lách	106.126268	10.279341	24.16	21.21	27.11	1.30	2026-01-25 01:08:14.765899+00
1	2026-01-01	2026	1	An Giang	Châu Đốc	105.142854	10.705307	15.89	12.43	19.08	0.85	2026-01-24 13:09:14.587614+00
2	2026-02-01	2026	2	An Giang	Châu Đốc	105.142854	10.705307	19.28	15.90	22.69	0.85	2026-01-24 13:09:14.587614+00
3	2026-03-01	2026	3	An Giang	Châu Đốc	105.142854	10.705307	23.00	19.58	26.59	0.85	2026-01-24 13:09:14.587614+00
4	2026-04-01	2026	4	An Giang	Châu Đốc	105.142854	10.705307	20.34	16.69	23.72	0.85	2026-01-24 13:09:14.587614+00
5	2026-05-01	2026	5	An Giang	Châu Đốc	105.142854	10.705307	13.48	10.09	16.78	0.85	2026-01-24 13:09:14.587614+00
6	2026-06-01	2026	6	An Giang	Châu Đốc	105.142854	10.705307	7.29	3.96	10.60	0.85	2026-01-24 13:09:14.587614+00
7	2026-07-01	2026	7	An Giang	Châu Đốc	105.142854	10.705307	3.71	0.14	6.97	0.85	2026-01-24 13:09:14.587614+00
8	2026-08-01	2026	8	An Giang	Châu Đốc	105.142854	10.705307	2.50	0.00	6.02	0.85	2026-01-24 13:09:14.587614+00
9	2026-09-01	2026	9	An Giang	Châu Đốc	105.142854	10.705307	2.48	0.00	5.96	0.85	2026-01-24 13:09:14.587614+00
10	2026-10-01	2026	10	An Giang	Châu Đốc	105.142854	10.705307	3.61	0.01	7.20	0.85	2026-01-24 13:09:14.587614+00
11	2026-11-01	2026	11	An Giang	Châu Đốc	105.142854	10.705307	7.13	3.56	10.67	0.85	2026-01-24 13:09:14.587614+00
12	2026-12-01	2026	12	An Giang	Châu Đốc	105.142854	10.705307	11.82	8.35	14.97	0.85	2026-01-24 13:09:14.587614+00
13	2026-01-01	2026	1	An Giang	Tân Châu	105.251923	10.804204	17.78	14.17	21.26	0.85	2026-01-24 13:09:14.587614+00
14	2026-02-01	2026	2	An Giang	Tân Châu	105.251923	10.804204	21.52	17.75	25.05	0.85	2026-01-24 13:09:14.587614+00
15	2026-03-01	2026	3	An Giang	Tân Châu	105.251923	10.804204	25.33	21.90	29.07	0.85	2026-01-24 13:09:14.587614+00
16	2026-04-01	2026	4	An Giang	Tân Châu	105.251923	10.804204	22.88	19.41	26.41	0.85	2026-01-24 13:09:14.587614+00
17	2026-05-01	2026	5	An Giang	Tân Châu	105.251923	10.804204	15.33	11.81	18.75	0.85	2026-01-24 13:09:14.587614+00
18	2026-06-01	2026	6	An Giang	Tân Châu	105.251923	10.804204	9.05	5.47	12.29	0.85	2026-01-24 13:09:14.587614+00
19	2026-07-01	2026	7	An Giang	Tân Châu	105.251923	10.804204	5.37	1.76	9.04	0.85	2026-01-24 13:09:14.587614+00
20	2026-08-01	2026	8	An Giang	Tân Châu	105.251923	10.804204	4.15	0.55	7.63	0.85	2026-01-24 13:09:14.587614+00
21	2026-09-01	2026	9	An Giang	Tân Châu	105.251923	10.804204	4.18	0.80	7.65	0.85	2026-01-24 13:09:14.587614+00
22	2026-10-01	2026	10	An Giang	Tân Châu	105.251923	10.804204	5.37	1.95	9.19	0.85	2026-01-24 13:09:14.587614+00
23	2026-11-01	2026	11	An Giang	Tân Châu	105.251923	10.804204	9.07	5.30	12.45	0.85	2026-01-24 13:09:14.587614+00
24	2026-12-01	2026	12	An Giang	Tân Châu	105.251923	10.804204	13.97	10.26	17.05	0.85	2026-01-24 13:09:14.587614+00
337	2026-01-01	2026	1	An Giang	Vàm Nao	105.363475	10.579197	11.30	8.71	13.78	0.85	2026-01-24 15:31:24.572065+00
338	2026-02-01	2026	2	An Giang	Vàm Nao	105.363475	10.579197	14.24	11.79	16.81	0.85	2026-01-24 15:31:24.572065+00
339	2026-03-01	2026	3	An Giang	Vàm Nao	105.363475	10.579197	16.86	14.33	19.50	0.85	2026-01-24 15:31:24.572065+00
340	2026-04-01	2026	4	An Giang	Vàm Nao	105.363475	10.579197	14.96	12.24	17.40	0.85	2026-01-24 15:31:24.572065+00
341	2026-05-01	2026	5	An Giang	Vàm Nao	105.363475	10.579197	9.32	6.79	11.83	0.85	2026-01-24 15:31:24.572065+00
342	2026-06-01	2026	6	An Giang	Vàm Nao	105.363475	10.579197	4.53	1.90	7.09	0.85	2026-01-24 15:31:24.572065+00
343	2026-07-01	2026	7	An Giang	Vàm Nao	105.363475	10.579197	1.65	0.00	4.26	0.85	2026-01-24 15:31:24.572065+00
121	2026-01-01	2026	1	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.66	0.14	1.19	1.16	2026-01-24 13:09:14.587614+00
122	2026-02-01	2026	2	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.95	0.42	1.47	1.16	2026-01-24 13:09:14.587614+00
123	2026-03-01	2026	3	Hậu Giang	Phụng Hiệp	105.835000	9.810000	1.24	0.75	1.80	1.16	2026-01-24 13:09:14.587614+00
124	2026-04-01	2026	4	Hậu Giang	Phụng Hiệp	105.835000	9.810000	1.04	0.54	1.56	1.16	2026-01-24 13:09:14.587614+00
125	2026-05-01	2026	5	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.51	0.00	1.01	1.16	2026-01-24 13:09:14.587614+00
126	2026-06-01	2026	6	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.01	0.00	0.51	1.16	2026-01-24 13:09:14.587614+00
127	2026-07-01	2026	7	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.29	1.16	2026-01-24 13:09:14.587614+00
988	2027-04-01	2027	4	Bến Tre	Chợ Lách	106.126268	10.279341	21.24	18.26	23.98	1.30	2026-01-25 01:08:14.765899+00
989	2027-05-01	2027	5	Bến Tre	Chợ Lách	106.126268	10.279341	14.90	12.10	17.71	1.30	2026-01-25 01:08:14.765899+00
990	2027-06-01	2027	6	Bến Tre	Chợ Lách	106.126268	10.279341	8.94	6.00	11.75	1.30	2026-01-25 01:08:14.765899+00
991	2027-07-01	2027	7	Bến Tre	Chợ Lách	106.126268	10.279341	5.58	2.58	8.47	1.30	2026-01-25 01:08:14.765899+00
992	2027-08-01	2027	8	Bến Tre	Chợ Lách	106.126268	10.279341	4.50	1.64	7.38	1.30	2026-01-25 01:08:14.765899+00
993	2027-09-01	2027	9	Bến Tre	Chợ Lách	106.126268	10.279341	4.53	1.55	7.15	1.30	2026-01-25 01:08:14.765899+00
994	2027-10-01	2027	10	Bến Tre	Chợ Lách	106.126268	10.279341	5.62	2.66	8.36	1.30	2026-01-25 01:08:14.765899+00
995	2027-11-01	2027	11	Bến Tre	Chợ Lách	106.126268	10.279341	9.00	6.38	12.01	1.30	2026-01-25 01:08:14.765899+00
996	2027-12-01	2027	12	Bến Tre	Chợ Lách	106.126268	10.279341	13.39	10.67	16.31	1.30	2026-01-25 01:08:14.765899+00
997	2028-01-01	2028	1	Bến Tre	Chợ Lách	106.126268	10.279341	17.14	14.03	20.02	1.30	2026-01-25 01:08:14.765899+00
998	2028-02-01	2028	2	Bến Tre	Chợ Lách	106.126268	10.279341	20.05	17.06	22.66	1.30	2026-01-25 01:08:14.765899+00
999	2028-03-01	2028	3	Bến Tre	Chợ Lách	106.126268	10.279341	23.64	20.71	26.49	1.30	2026-01-25 01:08:14.765899+00
277	2026-01-01	2026	1	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.49	0.34	0.65	1.10	2026-01-24 13:09:14.587614+00
278	2026-02-01	2026	2	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.63	0.46	0.79	1.10	2026-01-24 13:09:14.587614+00
279	2026-03-01	2026	3	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.77	0.61	0.93	1.10	2026-01-24 13:09:14.587614+00
280	2026-04-01	2026	4	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.68	0.52	0.84	1.10	2026-01-24 13:09:14.587614+00
281	2026-05-01	2026	5	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.41	0.25	0.57	1.10	2026-01-24 13:09:14.587614+00
282	2026-06-01	2026	6	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.18	0.03	0.35	1.10	2026-01-24 13:09:14.587614+00
283	2026-07-01	2026	7	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.05	0.00	0.19	1.10	2026-01-24 13:09:14.587614+00
284	2026-08-01	2026	8	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.00	0.00	0.15	1.10	2026-01-24 13:09:14.587614+00
285	2026-09-01	2026	9	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.00	0.00	0.16	1.10	2026-01-24 13:09:14.587614+00
286	2026-10-01	2026	10	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.05	0.00	0.22	1.10	2026-01-24 13:09:14.587614+00
287	2026-11-01	2026	11	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.19	0.03	0.35	1.10	2026-01-24 13:09:14.587614+00
288	2026-12-01	2026	12	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.37	0.20	0.52	1.10	2026-01-24 13:09:14.587614+00
289	2026-01-01	2026	1	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.25	0.09	0.39	0.85	2026-01-24 13:09:14.587614+00
290	2026-02-01	2026	2	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.36	0.22	0.50	0.85	2026-01-24 13:09:14.587614+00
291	2026-03-01	2026	3	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.49	0.35	0.64	0.85	2026-01-24 13:09:14.587614+00
292	2026-04-01	2026	4	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.40	0.25	0.54	0.85	2026-01-24 13:09:14.587614+00
293	2026-05-01	2026	5	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.15	0.01	0.31	0.85	2026-01-24 13:09:14.587614+00
294	2026-06-01	2026	6	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	0.08	0.85	2026-01-24 13:09:14.587614+00
295	2026-07-01	2026	7	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.03	0.85	2026-01-24 13:09:14.587614+00
296	2026-08-01	2026	8	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.08	0.85	2026-01-24 13:09:14.587614+00
297	2026-09-01	2026	9	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.08	0.85	2026-01-24 13:09:14.587614+00
1000	2028-04-01	2028	4	Bến Tre	Chợ Lách	106.126268	10.279341	21.33	18.33	24.23	1.30	2026-01-25 01:08:14.765899+00
1001	2028-05-01	2028	5	Bến Tre	Chợ Lách	106.126268	10.279341	14.88	11.93	17.73	1.30	2026-01-25 01:08:14.765899+00
1002	2028-06-01	2028	6	Bến Tre	Chợ Lách	106.126268	10.279341	9.28	6.20	12.06	1.30	2026-01-25 01:08:14.765899+00
1003	2028-07-01	2028	7	Bến Tre	Chợ Lách	106.126268	10.279341	5.88	2.79	8.84	1.30	2026-01-25 01:08:14.765899+00
1004	2028-08-01	2028	8	Bến Tre	Chợ Lách	106.126268	10.279341	4.70	1.84	7.65	1.30	2026-01-25 01:08:14.765899+00
1005	2028-09-01	2028	9	Bến Tre	Chợ Lách	106.126268	10.279341	4.67	1.61	7.64	1.30	2026-01-25 01:08:14.765899+00
1006	2028-10-01	2028	10	Bến Tre	Chợ Lách	106.126268	10.279341	5.84	2.62	8.58	1.30	2026-01-25 01:08:14.765899+00
1007	2028-11-01	2028	11	Bến Tre	Chợ Lách	106.126268	10.279341	9.19	6.16	12.19	1.30	2026-01-25 01:08:14.765899+00
1008	2028-12-01	2028	12	Bến Tre	Chợ Lách	106.126268	10.279341	13.68	10.67	16.58	1.30	2026-01-25 01:08:14.765899+00
73	2026-01-01	2026	1	Bến Tre	Sơn Đốc	106.380000	10.110000	0.83	0.70	0.96	1.30	2026-01-24 13:09:14.587614+00
74	2026-02-01	2026	2	Bến Tre	Sơn Đốc	106.380000	10.110000	1.02	0.89	1.15	1.30	2026-01-24 13:09:14.587614+00
75	2026-03-01	2026	3	Bến Tre	Sơn Đốc	106.380000	10.110000	1.23	1.10	1.36	1.30	2026-01-24 13:09:14.587614+00
76	2026-04-01	2026	4	Bến Tre	Sơn Đốc	106.380000	10.110000	1.09	0.97	1.21	1.30	2026-01-24 13:09:14.587614+00
77	2026-05-01	2026	5	Bến Tre	Sơn Đốc	106.380000	10.110000	0.70	0.58	0.83	1.30	2026-01-24 13:09:14.587614+00
78	2026-06-01	2026	6	Bến Tre	Sơn Đốc	106.380000	10.110000	0.39	0.26	0.51	1.30	2026-01-24 13:09:14.587614+00
79	2026-07-01	2026	7	Bến Tre	Sơn Đốc	106.380000	10.110000	0.19	0.07	0.31	1.30	2026-01-24 13:09:14.587614+00
80	2026-08-01	2026	8	Bến Tre	Sơn Đốc	106.380000	10.110000	0.12	0.00	0.25	1.30	2026-01-24 13:09:14.587614+00
81	2026-09-01	2026	9	Bến Tre	Sơn Đốc	106.380000	10.110000	0.12	0.00	0.24	1.30	2026-01-24 13:09:14.587614+00
82	2026-10-01	2026	10	Bến Tre	Sơn Đốc	106.380000	10.110000	0.19	0.07	0.32	1.30	2026-01-24 13:09:14.587614+00
83	2026-11-01	2026	11	Bến Tre	Sơn Đốc	106.380000	10.110000	0.38	0.25	0.50	1.30	2026-01-24 13:09:14.587614+00
84	2026-12-01	2026	12	Bến Tre	Sơn Đốc	106.380000	10.110000	0.64	0.51	0.77	1.30	2026-01-24 13:09:14.587614+00
1021	2027-01-01	2027	1	Bến Tre	Sơn Đốc	106.380000	10.110000	0.86	0.74	0.99	1.30	2026-01-25 01:08:14.765899+00
1022	2027-02-01	2027	2	Bến Tre	Sơn Đốc	106.380000	10.110000	1.06	0.94	1.18	1.30	2026-01-25 01:08:14.765899+00
1023	2027-03-01	2027	3	Bến Tre	Sơn Đốc	106.380000	10.110000	1.25	1.12	1.37	1.30	2026-01-25 01:08:14.765899+00
1024	2027-04-01	2027	4	Bến Tre	Sơn Đốc	106.380000	10.110000	1.09	0.98	1.22	1.30	2026-01-25 01:08:14.765899+00
1025	2027-05-01	2027	5	Bến Tre	Sơn Đốc	106.380000	10.110000	0.73	0.60	0.86	1.30	2026-01-25 01:08:14.765899+00
1026	2027-06-01	2027	6	Bến Tre	Sơn Đốc	106.380000	10.110000	0.42	0.29	0.55	1.30	2026-01-25 01:08:14.765899+00
1027	2027-07-01	2027	7	Bến Tre	Sơn Đốc	106.380000	10.110000	0.22	0.09	0.34	1.30	2026-01-25 01:08:14.765899+00
1028	2027-08-01	2027	8	Bến Tre	Sơn Đốc	106.380000	10.110000	0.14	0.02	0.28	1.30	2026-01-25 01:08:14.765899+00
1029	2027-09-01	2027	9	Bến Tre	Sơn Đốc	106.380000	10.110000	0.14	0.01	0.27	1.30	2026-01-25 01:08:14.765899+00
1030	2027-10-01	2027	10	Bến Tre	Sơn Đốc	106.380000	10.110000	0.21	0.08	0.34	1.30	2026-01-25 01:08:14.765899+00
1031	2027-11-01	2027	11	Bến Tre	Sơn Đốc	106.380000	10.110000	0.39	0.26	0.52	1.30	2026-01-25 01:08:14.765899+00
1032	2027-12-01	2027	12	Bến Tre	Sơn Đốc	106.380000	10.110000	0.65	0.52	0.78	1.30	2026-01-25 01:08:14.765899+00
1033	2028-01-01	2028	1	Bến Tre	Sơn Đốc	106.380000	10.110000	0.86	0.72	0.99	1.30	2026-01-25 01:08:14.765899+00
1034	2028-02-01	2028	2	Bến Tre	Sơn Đốc	106.380000	10.110000	1.08	0.94	1.21	1.30	2026-01-25 01:08:14.765899+00
1035	2028-03-01	2028	3	Bến Tre	Sơn Đốc	106.380000	10.110000	1.26	1.13	1.39	1.30	2026-01-25 01:08:14.765899+00
1036	2028-04-01	2028	4	Bến Tre	Sơn Đốc	106.380000	10.110000	1.14	1.01	1.27	1.30	2026-01-25 01:08:14.765899+00
1037	2028-05-01	2028	5	Bến Tre	Sơn Đốc	106.380000	10.110000	0.72	0.60	0.85	1.30	2026-01-25 01:08:14.765899+00
1038	2028-06-01	2028	6	Bến Tre	Sơn Đốc	106.380000	10.110000	0.38	0.26	0.51	1.30	2026-01-25 01:08:14.765899+00
1039	2028-07-01	2028	7	Bến Tre	Sơn Đốc	106.380000	10.110000	0.19	0.07	0.33	1.30	2026-01-25 01:08:14.765899+00
1040	2028-08-01	2028	8	Bến Tre	Sơn Đốc	106.380000	10.110000	0.13	0.00	0.27	1.30	2026-01-25 01:08:14.765899+00
1041	2028-09-01	2028	9	Bến Tre	Sơn Đốc	106.380000	10.110000	0.14	0.01	0.26	1.30	2026-01-25 01:08:14.765899+00
1042	2028-10-01	2028	10	Bến Tre	Sơn Đốc	106.380000	10.110000	0.21	0.08	0.34	1.30	2026-01-25 01:08:14.765899+00
1043	2028-11-01	2028	11	Bến Tre	Sơn Đốc	106.380000	10.110000	0.41	0.28	0.53	1.30	2026-01-25 01:08:14.765899+00
1044	2028-12-01	2028	12	Bến Tre	Sơn Đốc	106.380000	10.110000	0.68	0.55	0.81	1.30	2026-01-25 01:08:14.765899+00
85	2026-01-01	2026	1	Cà Mau	Cà Mau	105.150000	9.176000	3.05	2.44	3.73	1.49	2026-01-24 13:09:14.587614+00
86	2026-02-01	2026	2	Cà Mau	Cà Mau	105.150000	9.176000	3.51	2.87	4.17	1.49	2026-01-24 13:09:14.587614+00
87	2026-03-01	2026	3	Cà Mau	Cà Mau	105.150000	9.176000	3.95	3.28	4.59	1.49	2026-01-24 13:09:14.587614+00
88	2026-04-01	2026	4	Cà Mau	Cà Mau	105.150000	9.176000	3.66	3.05	4.32	1.49	2026-01-24 13:09:14.587614+00
89	2026-05-01	2026	5	Cà Mau	Cà Mau	105.150000	9.176000	2.78	2.11	3.43	1.49	2026-01-24 13:09:14.587614+00
90	2026-06-01	2026	6	Cà Mau	Cà Mau	105.150000	9.176000	2.08	1.43	2.73	1.49	2026-01-24 13:09:14.587614+00
91	2026-07-01	2026	7	Cà Mau	Cà Mau	105.150000	9.176000	1.65	0.98	2.30	1.49	2026-01-24 13:09:14.587614+00
92	2026-08-01	2026	8	Cà Mau	Cà Mau	105.150000	9.176000	1.53	0.90	2.15	1.49	2026-01-24 13:09:14.587614+00
93	2026-09-01	2026	9	Cà Mau	Cà Mau	105.150000	9.176000	1.55	0.87	2.18	1.49	2026-01-24 13:09:14.587614+00
94	2026-10-01	2026	10	Cà Mau	Cà Mau	105.150000	9.176000	1.71	1.05	2.39	1.49	2026-01-24 13:09:14.587614+00
95	2026-11-01	2026	11	Cà Mau	Cà Mau	105.150000	9.176000	2.16	1.54	2.81	1.49	2026-01-24 13:09:14.587614+00
96	2026-12-01	2026	12	Cà Mau	Cà Mau	105.150000	9.176000	2.76	2.10	3.41	1.49	2026-01-24 13:09:14.587614+00
1057	2027-01-01	2027	1	Cà Mau	Cà Mau	105.150000	9.176000	3.22	2.60	3.86	1.49	2026-01-25 01:08:14.765899+00
1058	2027-02-01	2027	2	Cà Mau	Cà Mau	105.150000	9.176000	3.64	3.01	4.30	1.49	2026-01-25 01:08:14.765899+00
1059	2027-03-01	2027	3	Cà Mau	Cà Mau	105.150000	9.176000	4.16	3.50	4.81	1.49	2026-01-25 01:08:14.765899+00
1060	2027-04-01	2027	4	Cà Mau	Cà Mau	105.150000	9.176000	3.86	3.18	4.52	1.49	2026-01-25 01:08:14.765899+00
1061	2027-05-01	2027	5	Cà Mau	Cà Mau	105.150000	9.176000	2.96	2.31	3.62	1.49	2026-01-25 01:08:14.765899+00
1062	2027-06-01	2027	6	Cà Mau	Cà Mau	105.150000	9.176000	2.25	1.55	2.90	1.49	2026-01-25 01:08:14.765899+00
1063	2027-07-01	2027	7	Cà Mau	Cà Mau	105.150000	9.176000	1.82	1.18	2.48	1.49	2026-01-25 01:08:14.765899+00
1064	2027-08-01	2027	8	Cà Mau	Cà Mau	105.150000	9.176000	1.71	1.09	2.31	1.49	2026-01-25 01:08:14.765899+00
1065	2027-09-01	2027	9	Cà Mau	Cà Mau	105.150000	9.176000	1.73	1.10	2.38	1.49	2026-01-25 01:08:14.765899+00
1066	2027-10-01	2027	10	Cà Mau	Cà Mau	105.150000	9.176000	1.88	1.20	2.53	1.49	2026-01-25 01:08:14.765899+00
1067	2027-11-01	2027	11	Cà Mau	Cà Mau	105.150000	9.176000	2.35	1.71	3.01	1.49	2026-01-25 01:08:14.765899+00
1068	2027-12-01	2027	12	Cà Mau	Cà Mau	105.150000	9.176000	2.93	2.34	3.55	1.49	2026-01-25 01:08:14.765899+00
1069	2028-01-01	2028	1	Cà Mau	Cà Mau	105.150000	9.176000	3.51	2.83	4.17	1.49	2026-01-25 01:08:14.765899+00
1070	2028-02-01	2028	2	Cà Mau	Cà Mau	105.150000	9.176000	3.89	3.22	4.54	1.49	2026-01-25 01:08:14.765899+00
1071	2028-03-01	2028	3	Cà Mau	Cà Mau	105.150000	9.176000	4.37	3.70	5.04	1.49	2026-01-25 01:08:14.765899+00
1072	2028-04-01	2028	4	Cà Mau	Cà Mau	105.150000	9.176000	4.10	3.40	4.76	1.49	2026-01-25 01:08:14.765899+00
1073	2028-05-01	2028	5	Cà Mau	Cà Mau	105.150000	9.176000	3.26	2.62	3.92	1.49	2026-01-25 01:08:14.765899+00
1074	2028-06-01	2028	6	Cà Mau	Cà Mau	105.150000	9.176000	2.57	1.96	3.24	1.49	2026-01-25 01:08:14.765899+00
1075	2028-07-01	2028	7	Cà Mau	Cà Mau	105.150000	9.176000	2.15	1.49	2.81	1.49	2026-01-25 01:08:14.765899+00
1076	2028-08-01	2028	8	Cà Mau	Cà Mau	105.150000	9.176000	2.01	1.33	2.66	1.49	2026-01-25 01:08:14.765899+00
1077	2028-09-01	2028	9	Cà Mau	Cà Mau	105.150000	9.176000	2.02	1.35	2.68	1.49	2026-01-25 01:08:14.765899+00
1078	2028-10-01	2028	10	Cà Mau	Cà Mau	105.150000	9.176000	2.19	1.51	2.85	1.49	2026-01-25 01:08:14.765899+00
1079	2028-11-01	2028	11	Cà Mau	Cà Mau	105.150000	9.176000	2.64	1.97	3.29	1.49	2026-01-25 01:08:14.765899+00
1080	2028-12-01	2028	12	Cà Mau	Cà Mau	105.150000	9.176000	3.24	2.59	3.90	1.49	2026-01-25 01:08:14.765899+00
97	2026-01-01	2026	1	Cà Mau	Sông Đốc	104.835000	9.048000	3.12	1.50	4.82	1.49	2026-01-24 13:09:14.587614+00
98	2026-02-01	2026	2	Cà Mau	Sông Đốc	104.835000	9.048000	4.44	2.80	6.17	1.49	2026-01-24 13:09:14.587614+00
99	2026-03-01	2026	3	Cà Mau	Sông Đốc	104.835000	9.048000	5.89	4.25	7.61	1.49	2026-01-24 13:09:14.587614+00
100	2026-04-01	2026	4	Cà Mau	Sông Đốc	104.835000	9.048000	4.82	3.18	6.52	1.49	2026-01-24 13:09:14.587614+00
101	2026-05-01	2026	5	Cà Mau	Sông Đốc	104.835000	9.048000	1.92	0.28	3.69	1.49	2026-01-24 13:09:14.587614+00
102	2026-06-01	2026	6	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	1.23	1.49	2026-01-24 13:09:14.587614+00
103	2026-07-01	2026	7	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.06	1.49	2026-01-24 13:09:14.587614+00
104	2026-08-01	2026	8	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.56	1.49	2026-01-24 13:09:14.587614+00
105	2026-09-01	2026	9	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.55	1.49	2026-01-24 13:09:14.587614+00
106	2026-10-01	2026	10	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.13	1.49	2026-01-24 13:09:14.587614+00
107	2026-11-01	2026	11	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	1.18	1.49	2026-01-24 13:09:14.587614+00
108	2026-12-01	2026	12	Cà Mau	Sông Đốc	104.835000	9.048000	1.34	0.00	2.99	1.49	2026-01-24 13:09:14.587614+00
1093	2027-01-01	2027	1	Cà Mau	Sông Đốc	104.835000	9.048000	2.61	1.08	4.22	1.49	2026-01-25 01:08:14.765899+00
1094	2027-02-01	2027	2	Cà Mau	Sông Đốc	104.835000	9.048000	3.88	2.25	5.48	1.49	2026-01-25 01:08:14.765899+00
1095	2027-03-01	2027	3	Cà Mau	Sông Đốc	104.835000	9.048000	5.82	4.17	7.48	1.49	2026-01-25 01:08:14.765899+00
1096	2027-04-01	2027	4	Cà Mau	Sông Đốc	104.835000	9.048000	4.61	2.96	6.26	1.49	2026-01-25 01:08:14.765899+00
1097	2027-05-01	2027	5	Cà Mau	Sông Đốc	104.835000	9.048000	1.63	0.00	3.13	1.49	2026-01-25 01:08:14.765899+00
1098	2027-06-01	2027	6	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	0.85	1.49	2026-01-25 01:08:14.765899+00
1099	2027-07-01	2027	7	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.54	1.49	2026-01-25 01:08:14.765899+00
1100	2027-08-01	2027	8	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.89	1.49	2026-01-25 01:08:14.765899+00
1101	2027-09-01	2027	9	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.94	1.49	2026-01-25 01:08:14.765899+00
1102	2027-10-01	2027	10	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.38	1.49	2026-01-25 01:08:14.765899+00
1103	2027-11-01	2027	11	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	1.07	1.49	2026-01-25 01:08:14.765899+00
1104	2027-12-01	2027	12	Cà Mau	Sông Đốc	104.835000	9.048000	1.12	0.00	2.67	1.49	2026-01-25 01:08:14.765899+00
1105	2028-01-01	2028	1	Cà Mau	Sông Đốc	104.835000	9.048000	2.13	0.37	3.88	1.49	2026-01-25 01:08:14.765899+00
1106	2028-02-01	2028	2	Cà Mau	Sông Đốc	104.835000	9.048000	3.36	1.65	5.12	1.49	2026-01-25 01:08:14.765899+00
1107	2028-03-01	2028	3	Cà Mau	Sông Đốc	104.835000	9.048000	4.84	3.10	6.53	1.49	2026-01-25 01:08:14.765899+00
1108	2028-04-01	2028	4	Cà Mau	Sông Đốc	104.835000	9.048000	4.02	2.37	5.76	1.49	2026-01-25 01:08:14.765899+00
1109	2028-05-01	2028	5	Cà Mau	Sông Đốc	104.835000	9.048000	1.29	0.00	3.02	1.49	2026-01-25 01:08:14.765899+00
1110	2028-06-01	2028	6	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	0.85	1.49	2026-01-25 01:08:14.765899+00
1111	2028-07-01	2028	7	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.50	1.49	2026-01-25 01:08:14.765899+00
1112	2028-08-01	2028	8	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-1.11	1.49	2026-01-25 01:08:14.765899+00
1113	2028-09-01	2028	9	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-1.12	1.49	2026-01-25 01:08:14.765899+00
1114	2028-10-01	2028	10	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	-0.72	1.49	2026-01-25 01:08:14.765899+00
1115	2028-11-01	2028	11	Cà Mau	Sông Đốc	104.835000	9.048000	0.00	0.00	0.61	1.49	2026-01-25 01:08:14.765899+00
1116	2028-12-01	2028	12	Cà Mau	Sông Đốc	104.835000	9.048000	0.57	0.00	2.11	1.49	2026-01-25 01:08:14.765899+00
109	2026-01-01	2026	1	Cần Thơ	Cái Cui	105.805000	10.005000	1.39	1.08	1.66	0.85	2026-01-24 13:09:14.587614+00
110	2026-02-01	2026	2	Cần Thơ	Cái Cui	105.805000	10.005000	1.79	1.52	2.10	0.85	2026-01-24 13:09:14.587614+00
111	2026-03-01	2026	3	Cần Thơ	Cái Cui	105.805000	10.005000	2.19	1.90	2.48	0.85	2026-01-24 13:09:14.587614+00
112	2026-04-01	2026	4	Cần Thơ	Cái Cui	105.805000	10.005000	1.95	1.67	2.22	0.85	2026-01-24 13:09:14.587614+00
113	2026-05-01	2026	5	Cần Thơ	Cái Cui	105.805000	10.005000	1.17	0.89	1.44	0.85	2026-01-24 13:09:14.587614+00
114	2026-06-01	2026	6	Cần Thơ	Cái Cui	105.805000	10.005000	0.49	0.21	0.78	0.85	2026-01-24 13:09:14.587614+00
115	2026-07-01	2026	7	Cần Thơ	Cái Cui	105.805000	10.005000	0.10	0.00	0.38	0.85	2026-01-24 13:09:14.587614+00
116	2026-08-01	2026	8	Cần Thơ	Cái Cui	105.805000	10.005000	0.00	0.00	0.24	0.85	2026-01-24 13:09:14.587614+00
117	2026-09-01	2026	9	Cần Thơ	Cái Cui	105.805000	10.005000	0.00	0.00	0.24	0.85	2026-01-24 13:09:14.587614+00
118	2026-10-01	2026	10	Cần Thơ	Cái Cui	105.805000	10.005000	0.07	0.00	0.36	0.85	2026-01-24 13:09:14.587614+00
119	2026-11-01	2026	11	Cần Thơ	Cái Cui	105.805000	10.005000	0.44	0.16	0.73	0.85	2026-01-24 13:09:14.587614+00
120	2026-12-01	2026	12	Cần Thơ	Cái Cui	105.805000	10.005000	0.97	0.68	1.24	0.85	2026-01-24 13:09:14.587614+00
1129	2027-01-01	2027	1	Cần Thơ	Cái Cui	105.805000	10.005000	1.39	1.11	1.69	0.85	2026-01-25 01:08:14.765899+00
1130	2027-02-01	2027	2	Cần Thơ	Cái Cui	105.805000	10.005000	1.80	1.50	2.09	0.85	2026-01-25 01:08:14.765899+00
1131	2027-03-01	2027	3	Cần Thơ	Cái Cui	105.805000	10.005000	2.07	1.76	2.36	0.85	2026-01-25 01:08:14.765899+00
1132	2027-04-01	2027	4	Cần Thơ	Cái Cui	105.805000	10.005000	1.87	1.55	2.15	0.85	2026-01-25 01:08:14.765899+00
1133	2027-05-01	2027	5	Cần Thơ	Cái Cui	105.805000	10.005000	1.13	0.85	1.42	0.85	2026-01-25 01:08:14.765899+00
1134	2027-06-01	2027	6	Cần Thơ	Cái Cui	105.805000	10.005000	0.45	0.17	0.71	0.85	2026-01-25 01:08:14.765899+00
1135	2027-07-01	2027	7	Cần Thơ	Cái Cui	105.805000	10.005000	0.07	0.00	0.34	0.85	2026-01-25 01:08:14.765899+00
1136	2027-08-01	2027	8	Cần Thơ	Cái Cui	105.805000	10.005000	0.00	0.00	0.23	0.85	2026-01-25 01:08:14.765899+00
1137	2027-09-01	2027	9	Cần Thơ	Cái Cui	105.805000	10.005000	0.00	0.00	0.17	0.85	2026-01-25 01:08:14.765899+00
1138	2027-10-01	2027	10	Cần Thơ	Cái Cui	105.805000	10.005000	0.01	0.00	0.30	0.85	2026-01-25 01:08:14.765899+00
1139	2027-11-01	2027	11	Cần Thơ	Cái Cui	105.805000	10.005000	0.36	0.07	0.66	0.85	2026-01-25 01:08:14.765899+00
1140	2027-12-01	2027	12	Cần Thơ	Cái Cui	105.805000	10.005000	0.87	0.55	1.16	0.85	2026-01-25 01:08:14.765899+00
1141	2028-01-01	2028	1	Cần Thơ	Cái Cui	105.805000	10.005000	1.43	1.13	1.70	0.85	2026-01-25 01:08:14.765899+00
1142	2028-02-01	2028	2	Cần Thơ	Cái Cui	105.805000	10.005000	1.85	1.56	2.15	0.85	2026-01-25 01:08:14.765899+00
1143	2028-03-01	2028	3	Cần Thơ	Cái Cui	105.805000	10.005000	2.23	1.94	2.54	0.85	2026-01-25 01:08:14.765899+00
1144	2028-04-01	2028	4	Cần Thơ	Cái Cui	105.805000	10.005000	1.95	1.64	2.26	0.85	2026-01-25 01:08:14.765899+00
1145	2028-05-01	2028	5	Cần Thơ	Cái Cui	105.805000	10.005000	1.08	0.78	1.37	0.85	2026-01-25 01:08:14.765899+00
1146	2028-06-01	2028	6	Cần Thơ	Cái Cui	105.805000	10.005000	0.39	0.10	0.68	0.85	2026-01-25 01:08:14.765899+00
1147	2028-07-01	2028	7	Cần Thơ	Cái Cui	105.805000	10.005000	0.00	0.00	0.29	0.85	2026-01-25 01:08:14.765899+00
1148	2028-08-01	2028	8	Cần Thơ	Cái Cui	105.805000	10.005000	0.00	0.00	0.15	0.85	2026-01-25 01:08:14.765899+00
1149	2028-09-01	2028	9	Cần Thơ	Cái Cui	105.805000	10.005000	0.00	0.00	0.18	0.85	2026-01-25 01:08:14.765899+00
1150	2028-10-01	2028	10	Cần Thơ	Cái Cui	105.805000	10.005000	0.03	0.00	0.33	0.85	2026-01-25 01:08:14.765899+00
1151	2028-11-01	2028	11	Cần Thơ	Cái Cui	105.805000	10.005000	0.45	0.14	0.75	0.85	2026-01-25 01:08:14.765899+00
1152	2028-12-01	2028	12	Cần Thơ	Cái Cui	105.805000	10.005000	0.99	0.69	1.30	0.85	2026-01-25 01:08:14.765899+00
469	2026-01-01	2026	1	Cần Thơ	Ô Môn 2	105.677667	10.139456	22.42	19.54	25.36	0.85	2026-01-24 15:31:24.572065+00
470	2026-02-01	2026	2	Cần Thơ	Ô Môn 2	105.677667	10.139456	26.23	23.14	29.19	0.85	2026-01-24 15:31:24.572065+00
471	2026-03-01	2026	3	Cần Thơ	Ô Môn 2	105.677667	10.139456	30.93	27.92	33.80	0.85	2026-01-24 15:31:24.572065+00
472	2026-04-01	2026	4	Cần Thơ	Ô Môn 2	105.677667	10.139456	27.72	24.63	30.56	0.85	2026-01-24 15:31:24.572065+00
473	2026-05-01	2026	5	Cần Thơ	Ô Môn 2	105.677667	10.139456	19.43	16.58	22.20	0.85	2026-01-24 15:31:24.572065+00
474	2026-06-01	2026	6	Cần Thơ	Ô Môn 2	105.677667	10.139456	12.49	9.74	15.39	0.85	2026-01-24 15:31:24.572065+00
475	2026-07-01	2026	7	Cần Thơ	Ô Môn 2	105.677667	10.139456	8.44	5.37	11.49	0.85	2026-01-24 15:31:24.572065+00
476	2026-08-01	2026	8	Cần Thơ	Ô Môn 2	105.677667	10.139456	7.04	4.01	9.82	0.85	2026-01-24 15:31:24.572065+00
477	2026-09-01	2026	9	Cần Thơ	Ô Môn 2	105.677667	10.139456	7.04	4.13	9.95	0.85	2026-01-24 15:31:24.572065+00
478	2026-10-01	2026	10	Cần Thơ	Ô Môn 2	105.677667	10.139456	8.42	5.45	11.38	0.85	2026-01-24 15:31:24.572065+00
479	2026-11-01	2026	11	Cần Thơ	Ô Môn 2	105.677667	10.139456	12.67	9.78	15.67	0.85	2026-01-24 15:31:24.572065+00
480	2026-12-01	2026	12	Cần Thơ	Ô Môn 2	105.677667	10.139456	18.26	15.25	21.09	0.85	2026-01-24 15:31:24.572065+00
1165	2027-01-01	2027	1	Cần Thơ	Ô Môn 2	105.677667	10.139456	22.57	19.74	25.53	0.85	2026-01-25 01:08:14.765899+00
1166	2027-02-01	2027	2	Cần Thơ	Ô Môn 2	105.677667	10.139456	26.36	23.41	29.22	0.85	2026-01-25 01:08:14.765899+00
1167	2027-03-01	2027	3	Cần Thơ	Ô Môn 2	105.677667	10.139456	31.27	28.37	34.16	0.85	2026-01-25 01:08:14.765899+00
1168	2027-04-01	2027	4	Cần Thơ	Ô Môn 2	105.677667	10.139456	27.88	25.05	30.95	0.85	2026-01-25 01:08:14.765899+00
1169	2027-05-01	2027	5	Cần Thơ	Ô Môn 2	105.677667	10.139456	19.67	16.70	22.41	0.85	2026-01-25 01:08:14.765899+00
1170	2027-06-01	2027	6	Cần Thơ	Ô Môn 2	105.677667	10.139456	12.73	9.84	15.57	0.85	2026-01-25 01:08:14.765899+00
1171	2027-07-01	2027	7	Cần Thơ	Ô Môn 2	105.677667	10.139456	8.69	6.02	11.52	0.85	2026-01-25 01:08:14.765899+00
1172	2027-08-01	2027	8	Cần Thơ	Ô Môn 2	105.677667	10.139456	7.28	4.15	10.42	0.85	2026-01-25 01:08:14.765899+00
1173	2027-09-01	2027	9	Cần Thơ	Ô Môn 2	105.677667	10.139456	7.26	4.33	9.98	0.85	2026-01-25 01:08:14.765899+00
1174	2027-10-01	2027	10	Cần Thơ	Ô Môn 2	105.677667	10.139456	8.58	5.65	11.50	0.85	2026-01-25 01:08:14.765899+00
1175	2027-11-01	2027	11	Cần Thơ	Ô Môn 2	105.677667	10.139456	12.82	9.65	15.58	0.85	2026-01-25 01:08:14.765899+00
1176	2027-12-01	2027	12	Cần Thơ	Ô Môn 2	105.677667	10.139456	18.41	15.43	21.40	0.85	2026-01-25 01:08:14.765899+00
1177	2028-01-01	2028	1	Cần Thơ	Ô Môn 2	105.677667	10.139456	23.50	20.48	26.32	0.85	2026-01-25 01:08:14.765899+00
1178	2028-02-01	2028	2	Cần Thơ	Ô Môn 2	105.677667	10.139456	27.26	24.29	30.34	0.85	2026-01-25 01:08:14.765899+00
1179	2028-03-01	2028	3	Cần Thơ	Ô Môn 2	105.677667	10.139456	31.84	29.04	34.59	0.85	2026-01-25 01:08:14.765899+00
1180	2028-04-01	2028	4	Cần Thơ	Ô Môn 2	105.677667	10.139456	28.97	26.05	31.91	0.85	2026-01-25 01:08:14.765899+00
1181	2028-05-01	2028	5	Cần Thơ	Ô Môn 2	105.677667	10.139456	20.54	17.65	23.60	0.85	2026-01-25 01:08:14.765899+00
1182	2028-06-01	2028	6	Cần Thơ	Ô Môn 2	105.677667	10.139456	13.62	10.62	16.56	0.85	2026-01-25 01:08:14.765899+00
1183	2028-07-01	2028	7	Cần Thơ	Ô Môn 2	105.677667	10.139456	9.55	6.73	12.69	0.85	2026-01-25 01:08:14.765899+00
1184	2028-08-01	2028	8	Cần Thơ	Ô Môn 2	105.677667	10.139456	8.16	5.03	11.00	0.85	2026-01-25 01:08:14.765899+00
1185	2028-09-01	2028	9	Cần Thơ	Ô Môn 2	105.677667	10.139456	8.19	5.48	11.03	0.85	2026-01-25 01:08:15.360548+00
1186	2028-10-01	2028	10	Cần Thơ	Ô Môn 2	105.677667	10.139456	9.70	6.74	12.68	0.85	2026-01-25 01:08:15.360548+00
1187	2028-11-01	2028	11	Cần Thơ	Ô Môn 2	105.677667	10.139456	13.96	10.97	17.03	0.85	2026-01-25 01:08:15.360548+00
1188	2028-12-01	2028	12	Cần Thơ	Ô Môn 2	105.677667	10.139456	19.55	16.71	22.65	0.85	2026-01-25 01:08:15.360548+00
128	2026-08-01	2026	8	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.12	1.16	2026-01-24 13:09:14.587614+00
129	2026-09-01	2026	9	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.13	1.16	2026-01-24 13:09:14.587614+00
130	2026-10-01	2026	10	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.21	1.16	2026-01-24 13:09:14.587614+00
131	2026-11-01	2026	11	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.50	1.16	2026-01-24 13:09:14.587614+00
132	2026-12-01	2026	12	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.35	0.00	0.88	1.16	2026-01-24 13:09:14.587614+00
1201	2027-01-01	2027	1	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.70	0.15	1.19	1.16	2026-01-25 01:08:15.360548+00
1202	2027-02-01	2027	2	Hậu Giang	Phụng Hiệp	105.835000	9.810000	1.02	0.54	1.53	1.16	2026-01-25 01:08:15.360548+00
1203	2027-03-01	2027	3	Hậu Giang	Phụng Hiệp	105.835000	9.810000	1.13	0.66	1.63	1.16	2026-01-25 01:08:15.360548+00
1204	2027-04-01	2027	4	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.97	0.45	1.50	1.16	2026-01-25 01:08:15.360548+00
1205	2027-05-01	2027	5	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.48	0.01	0.95	1.16	2026-01-25 01:08:15.360548+00
1206	2027-06-01	2027	6	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.01	0.00	0.52	1.16	2026-01-25 01:08:15.360548+00
1207	2027-07-01	2027	7	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.25	1.16	2026-01-25 01:08:15.360548+00
1208	2027-08-01	2027	8	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.11	1.16	2026-01-25 01:08:15.360548+00
1209	2027-09-01	2027	9	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.11	1.16	2026-01-25 01:08:15.360548+00
1210	2027-10-01	2027	10	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.15	1.16	2026-01-25 01:08:15.360548+00
1211	2027-11-01	2027	11	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.43	1.16	2026-01-25 01:08:15.360548+00
1212	2027-12-01	2027	12	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.27	0.00	0.74	1.16	2026-01-25 01:08:15.360548+00
1213	2028-01-01	2028	1	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.71	0.21	1.19	1.16	2026-01-25 01:08:15.360548+00
1214	2028-02-01	2028	2	Hậu Giang	Phụng Hiệp	105.835000	9.810000	1.07	0.55	1.60	1.16	2026-01-25 01:08:15.360548+00
1215	2028-03-01	2028	3	Hậu Giang	Phụng Hiệp	105.835000	9.810000	1.32	0.82	1.83	1.16	2026-01-25 01:08:15.360548+00
1216	2028-04-01	2028	4	Hậu Giang	Phụng Hiệp	105.835000	9.810000	1.05	0.52	1.57	1.16	2026-01-25 01:08:15.360548+00
1217	2028-05-01	2028	5	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.43	0.00	0.95	1.16	2026-01-25 01:08:15.360548+00
1218	2028-06-01	2028	6	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.41	1.16	2026-01-25 01:08:15.360548+00
1219	2028-07-01	2028	7	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.08	1.16	2026-01-25 01:08:15.360548+00
1220	2028-08-01	2028	8	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.03	1.16	2026-01-25 01:08:15.360548+00
1221	2028-09-01	2028	9	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.01	1.16	2026-01-25 01:08:15.360548+00
1222	2028-10-01	2028	10	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.11	1.16	2026-01-25 01:08:15.360548+00
1223	2028-11-01	2028	11	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.00	0.00	0.47	1.16	2026-01-25 01:08:15.360548+00
1224	2028-12-01	2028	12	Hậu Giang	Phụng Hiệp	105.835000	9.810000	0.38	0.00	0.90	1.16	2026-01-25 01:08:15.360548+00
133	2026-01-01	2026	1	Hậu Giang	Vị Thanh	105.470000	9.775000	0.38	0.28	0.50	1.16	2026-01-24 13:09:14.587614+00
134	2026-02-01	2026	2	Hậu Giang	Vị Thanh	105.470000	9.775000	0.50	0.39	0.61	1.16	2026-01-24 13:09:14.587614+00
135	2026-03-01	2026	3	Hậu Giang	Vị Thanh	105.470000	9.775000	0.62	0.51	0.73	1.16	2026-01-24 13:09:14.587614+00
136	2026-04-01	2026	4	Hậu Giang	Vị Thanh	105.470000	9.775000	0.54	0.43	0.65	1.16	2026-01-24 13:09:14.587614+00
137	2026-05-01	2026	5	Hậu Giang	Vị Thanh	105.470000	9.775000	0.31	0.20	0.42	1.16	2026-01-24 13:09:14.587614+00
138	2026-06-01	2026	6	Hậu Giang	Vị Thanh	105.470000	9.775000	0.13	0.02	0.23	1.16	2026-01-24 13:09:14.587614+00
139	2026-07-01	2026	7	Hậu Giang	Vị Thanh	105.470000	9.775000	0.01	0.00	0.12	1.16	2026-01-24 13:09:14.587614+00
140	2026-08-01	2026	8	Hậu Giang	Vị Thanh	105.470000	9.775000	0.00	0.00	0.08	1.16	2026-01-24 13:09:14.587614+00
141	2026-09-01	2026	9	Hậu Giang	Vị Thanh	105.470000	9.775000	0.00	0.00	0.08	1.16	2026-01-24 13:09:14.587614+00
142	2026-10-01	2026	10	Hậu Giang	Vị Thanh	105.470000	9.775000	0.01	0.00	0.12	1.16	2026-01-24 13:09:14.587614+00
143	2026-11-01	2026	11	Hậu Giang	Vị Thanh	105.470000	9.775000	0.12	0.02	0.24	1.16	2026-01-24 13:09:14.587614+00
144	2026-12-01	2026	12	Hậu Giang	Vị Thanh	105.470000	9.775000	0.28	0.17	0.38	1.16	2026-01-24 13:09:14.587614+00
1237	2027-01-01	2027	1	Hậu Giang	Vị Thanh	105.470000	9.775000	0.40	0.29	0.51	1.16	2026-01-25 01:08:15.360548+00
1238	2027-02-01	2027	2	Hậu Giang	Vị Thanh	105.470000	9.775000	0.53	0.42	0.64	1.16	2026-01-25 01:08:15.360548+00
1239	2027-03-01	2027	3	Hậu Giang	Vị Thanh	105.470000	9.775000	0.62	0.51	0.74	1.16	2026-01-25 01:08:15.360548+00
1240	2027-04-01	2027	4	Hậu Giang	Vị Thanh	105.470000	9.775000	0.54	0.42	0.63	1.16	2026-01-25 01:08:15.360548+00
1241	2027-05-01	2027	5	Hậu Giang	Vị Thanh	105.470000	9.775000	0.32	0.22	0.43	1.16	2026-01-25 01:08:15.360548+00
1242	2027-06-01	2027	6	Hậu Giang	Vị Thanh	105.470000	9.775000	0.14	0.03	0.25	1.16	2026-01-25 01:08:15.360548+00
1243	2027-07-01	2027	7	Hậu Giang	Vị Thanh	105.470000	9.775000	0.03	0.00	0.13	1.16	2026-01-25 01:08:15.360548+00
1244	2027-08-01	2027	8	Hậu Giang	Vị Thanh	105.470000	9.775000	0.00	0.00	0.11	1.16	2026-01-25 01:08:15.360548+00
1245	2027-09-01	2027	9	Hậu Giang	Vị Thanh	105.470000	9.775000	0.00	0.00	0.09	1.16	2026-01-25 01:08:15.360548+00
1246	2027-10-01	2027	10	Hậu Giang	Vị Thanh	105.470000	9.775000	0.01	0.00	0.12	1.16	2026-01-25 01:08:15.360548+00
1247	2027-11-01	2027	11	Hậu Giang	Vị Thanh	105.470000	9.775000	0.12	0.01	0.22	1.16	2026-01-25 01:08:15.360548+00
1248	2027-12-01	2027	12	Hậu Giang	Vị Thanh	105.470000	9.775000	0.28	0.16	0.39	1.16	2026-01-25 01:08:15.360548+00
1249	2028-01-01	2028	1	Hậu Giang	Vị Thanh	105.470000	9.775000	0.39	0.28	0.50	1.16	2026-01-25 01:08:15.360548+00
1250	2028-02-01	2028	2	Hậu Giang	Vị Thanh	105.470000	9.775000	0.53	0.42	0.64	1.16	2026-01-25 01:08:15.360548+00
1251	2028-03-01	2028	3	Hậu Giang	Vị Thanh	105.470000	9.775000	0.64	0.53	0.75	1.16	2026-01-25 01:08:15.360548+00
1252	2028-04-01	2028	4	Hậu Giang	Vị Thanh	105.470000	9.775000	0.55	0.44	0.66	1.16	2026-01-25 01:08:15.360548+00
1253	2028-05-01	2028	5	Hậu Giang	Vị Thanh	105.470000	9.775000	0.30	0.18	0.41	1.16	2026-01-25 01:08:15.360548+00
1254	2028-06-01	2028	6	Hậu Giang	Vị Thanh	105.470000	9.775000	0.11	0.00	0.21	1.16	2026-01-25 01:08:15.360548+00
1255	2028-07-01	2028	7	Hậu Giang	Vị Thanh	105.470000	9.775000	0.00	0.00	0.09	1.16	2026-01-25 01:08:15.360548+00
1256	2028-08-01	2028	8	Hậu Giang	Vị Thanh	105.470000	9.775000	0.00	0.00	0.07	1.16	2026-01-25 01:08:15.360548+00
1257	2028-09-01	2028	9	Hậu Giang	Vị Thanh	105.470000	9.775000	0.00	0.00	0.07	1.16	2026-01-25 01:08:15.360548+00
1258	2028-10-01	2028	10	Hậu Giang	Vị Thanh	105.470000	9.775000	0.01	0.00	0.12	1.16	2026-01-25 01:08:15.360548+00
1259	2028-11-01	2028	11	Hậu Giang	Vị Thanh	105.470000	9.775000	0.13	0.01	0.23	1.16	2026-01-25 01:08:15.360548+00
1260	2028-12-01	2028	12	Hậu Giang	Vị Thanh	105.470000	9.775000	0.29	0.19	0.41	1.16	2026-01-25 01:08:15.360548+00
145	2026-01-01	2026	1	Kiên Giang	Rạch Giá	105.080000	10.010000	2.01	1.60	2.44	1.30	2026-01-24 13:09:14.587614+00
146	2026-02-01	2026	2	Kiên Giang	Rạch Giá	105.080000	10.010000	2.58	2.14	3.01	1.30	2026-01-24 13:09:14.587614+00
147	2026-03-01	2026	3	Kiên Giang	Rạch Giá	105.080000	10.010000	3.12	2.68	3.54	1.30	2026-01-24 13:09:14.587614+00
148	2026-04-01	2026	4	Kiên Giang	Rạch Giá	105.080000	10.010000	2.74	2.29	3.17	1.30	2026-01-24 13:09:14.587614+00
149	2026-05-01	2026	5	Kiên Giang	Rạch Giá	105.080000	10.010000	1.60	1.15	2.04	1.30	2026-01-24 13:09:14.587614+00
150	2026-06-01	2026	6	Kiên Giang	Rạch Giá	105.080000	10.010000	0.67	0.26	1.11	1.30	2026-01-24 13:09:14.587614+00
151	2026-07-01	2026	7	Kiên Giang	Rạch Giá	105.080000	10.010000	0.13	0.00	0.56	1.30	2026-01-24 13:09:14.587614+00
152	2026-08-01	2026	8	Kiên Giang	Rạch Giá	105.080000	10.010000	0.00	0.00	0.41	1.30	2026-01-24 13:09:14.587614+00
153	2026-09-01	2026	9	Kiên Giang	Rạch Giá	105.080000	10.010000	0.00	0.00	0.38	1.30	2026-01-24 13:09:14.587614+00
154	2026-10-01	2026	10	Kiên Giang	Rạch Giá	105.080000	10.010000	0.13	0.00	0.52	1.30	2026-01-24 13:09:14.587614+00
155	2026-11-01	2026	11	Kiên Giang	Rạch Giá	105.080000	10.010000	0.68	0.26	1.12	1.30	2026-01-24 13:09:14.587614+00
156	2026-12-01	2026	12	Kiên Giang	Rạch Giá	105.080000	10.010000	1.41	0.96	1.84	1.30	2026-01-24 13:09:14.587614+00
1273	2027-01-01	2027	1	Kiên Giang	Rạch Giá	105.080000	10.010000	1.91	1.45	2.35	1.30	2026-01-25 01:08:15.360548+00
1274	2027-02-01	2027	2	Kiên Giang	Rạch Giá	105.080000	10.010000	2.42	2.00	2.86	1.30	2026-01-25 01:08:15.360548+00
1275	2027-03-01	2027	3	Kiên Giang	Rạch Giá	105.080000	10.010000	3.13	2.69	3.58	1.30	2026-01-25 01:08:15.360548+00
1276	2027-04-01	2027	4	Kiên Giang	Rạch Giá	105.080000	10.010000	2.72	2.29	3.17	1.30	2026-01-25 01:08:15.360548+00
1277	2027-05-01	2027	5	Kiên Giang	Rạch Giá	105.080000	10.010000	1.56	1.15	2.03	1.30	2026-01-25 01:08:15.360548+00
1278	2027-06-01	2027	6	Kiên Giang	Rạch Giá	105.080000	10.010000	0.59	0.17	1.02	1.30	2026-01-25 01:08:15.360548+00
1279	2027-07-01	2027	7	Kiên Giang	Rạch Giá	105.080000	10.010000	0.05	0.00	0.50	1.30	2026-01-25 01:08:15.360548+00
1280	2027-08-01	2027	8	Kiên Giang	Rạch Giá	105.080000	10.010000	0.00	0.00	0.32	1.30	2026-01-25 01:08:15.360548+00
1281	2027-09-01	2027	9	Kiên Giang	Rạch Giá	105.080000	10.010000	0.00	0.00	0.34	1.30	2026-01-25 01:08:15.360548+00
1282	2027-10-01	2027	10	Kiên Giang	Rạch Giá	105.080000	10.010000	0.09	0.00	0.51	1.30	2026-01-25 01:08:15.360548+00
1283	2027-11-01	2027	11	Kiên Giang	Rạch Giá	105.080000	10.010000	0.66	0.21	1.10	1.30	2026-01-25 01:08:15.360548+00
1284	2027-12-01	2027	12	Kiên Giang	Rạch Giá	105.080000	10.010000	1.38	0.94	1.79	1.30	2026-01-25 01:08:15.360548+00
1285	2028-01-01	2028	1	Kiên Giang	Rạch Giá	105.080000	10.010000	1.80	1.36	2.25	1.30	2026-01-25 01:08:15.360548+00
1286	2028-02-01	2028	2	Kiên Giang	Rạch Giá	105.080000	10.010000	2.26	1.84	2.73	1.30	2026-01-25 01:08:15.360548+00
1287	2028-03-01	2028	3	Kiên Giang	Rạch Giá	105.080000	10.010000	2.87	2.42	3.36	1.30	2026-01-25 01:08:15.360548+00
1288	2028-04-01	2028	4	Kiên Giang	Rạch Giá	105.080000	10.010000	2.53	2.11	2.97	1.30	2026-01-25 01:08:15.360548+00
1289	2028-05-01	2028	5	Kiên Giang	Rạch Giá	105.080000	10.010000	1.44	0.98	1.87	1.30	2026-01-25 01:08:15.360548+00
1290	2028-06-01	2028	6	Kiên Giang	Rạch Giá	105.080000	10.010000	0.58	0.18	1.07	1.30	2026-01-25 01:08:15.360548+00
1291	2028-07-01	2028	7	Kiên Giang	Rạch Giá	105.080000	10.010000	0.05	0.00	0.50	1.30	2026-01-25 01:08:15.360548+00
1292	2028-08-01	2028	8	Kiên Giang	Rạch Giá	105.080000	10.010000	0.00	0.00	0.32	1.30	2026-01-25 01:08:15.360548+00
1293	2028-09-01	2028	9	Kiên Giang	Rạch Giá	105.080000	10.010000	0.00	0.00	0.28	1.30	2026-01-25 01:08:15.360548+00
1294	2028-10-01	2028	10	Kiên Giang	Rạch Giá	105.080000	10.010000	0.00	0.00	0.44	1.30	2026-01-25 01:08:15.360548+00
1295	2028-11-01	2028	11	Kiên Giang	Rạch Giá	105.080000	10.010000	0.50	0.06	0.95	1.30	2026-01-25 01:08:15.360548+00
1296	2028-12-01	2028	12	Kiên Giang	Rạch Giá	105.080000	10.010000	1.23	0.74	1.67	1.30	2026-01-25 01:08:15.360548+00
517	2026-01-01	2026	1	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.00	0.47	1.55	1.30	2026-01-24 15:31:24.572065+00
518	2026-02-01	2026	2	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.20	0.63	1.77	1.30	2026-01-24 15:31:24.572065+00
519	2026-03-01	2026	3	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.39	0.78	1.93	1.30	2026-01-24 15:31:24.572065+00
520	2026-04-01	2026	4	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.27	0.72	1.83	1.30	2026-01-24 15:31:24.572065+00
521	2026-05-01	2026	5	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.89	0.36	1.48	1.30	2026-01-24 15:31:24.572065+00
522	2026-06-01	2026	6	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.58	0.00	1.11	1.30	2026-01-24 15:31:24.572065+00
523	2026-07-01	2026	7	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.39	0.00	0.95	1.30	2026-01-24 15:31:24.572065+00
524	2026-08-01	2026	8	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.33	0.00	0.90	1.30	2026-01-24 15:31:24.572065+00
525	2026-09-01	2026	9	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.34	0.00	0.89	1.30	2026-01-24 15:31:24.572065+00
526	2026-10-01	2026	10	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.40	0.00	0.95	1.30	2026-01-24 15:31:24.572065+00
527	2026-11-01	2026	11	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.60	0.04	1.21	1.30	2026-01-24 15:31:24.572065+00
528	2026-12-01	2026	12	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.85	0.26	1.45	1.30	2026-01-24 15:31:24.572065+00
1309	2027-01-01	2027	1	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.09	0.54	1.65	1.30	2026-01-25 01:08:15.360548+00
1310	2027-02-01	2027	2	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.29	0.72	1.87	1.30	2026-01-25 01:08:15.360548+00
1311	2027-03-01	2027	3	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.48	0.91	2.11	1.30	2026-01-25 01:08:15.360548+00
1312	2027-04-01	2027	4	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.35	0.76	1.87	1.30	2026-01-25 01:08:15.360548+00
1313	2027-05-01	2027	5	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.98	0.44	1.55	1.30	2026-01-25 01:08:15.360548+00
1314	2027-06-01	2027	6	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.68	0.11	1.28	1.30	2026-01-25 01:08:15.360548+00
1315	2027-07-01	2027	7	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.49	0.00	1.06	1.30	2026-01-25 01:08:15.360548+00
1316	2027-08-01	2027	8	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.43	0.00	1.01	1.30	2026-01-25 01:08:15.360548+00
1317	2027-09-01	2027	9	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.43	0.00	1.02	1.30	2026-01-25 01:08:15.360548+00
1318	2027-10-01	2027	10	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.49	0.00	1.10	1.30	2026-01-25 01:08:15.360548+00
1319	2027-11-01	2027	11	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.68	0.11	1.23	1.30	2026-01-25 01:08:15.360548+00
1320	2027-12-01	2027	12	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.93	0.39	1.53	1.30	2026-01-25 01:08:15.360548+00
1321	2028-01-01	2028	1	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.08	0.53	1.67	1.30	2026-01-25 01:08:15.360548+00
1322	2028-02-01	2028	2	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.28	0.68	1.85	1.30	2026-01-25 01:08:15.360548+00
1323	2028-03-01	2028	3	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.48	0.89	2.05	1.30	2026-01-25 01:08:15.360548+00
1324	2028-04-01	2028	4	Kiên Giang	Tân Hiệp	105.268781	10.097586	1.35	0.77	1.94	1.30	2026-01-25 01:08:15.360548+00
1325	2028-05-01	2028	5	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.97	0.41	1.55	1.30	2026-01-25 01:08:15.360548+00
1326	2028-06-01	2028	6	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.66	0.05	1.28	1.30	2026-01-25 01:08:15.360548+00
1327	2028-07-01	2028	7	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.47	0.00	1.05	1.30	2026-01-25 01:08:15.360548+00
1328	2028-08-01	2028	8	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.41	0.00	0.98	1.30	2026-01-25 01:08:15.360548+00
1329	2028-09-01	2028	9	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.42	0.00	1.02	1.30	2026-01-25 01:08:15.360548+00
1330	2028-10-01	2028	10	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.49	0.00	1.08	1.30	2026-01-25 01:08:15.360548+00
1331	2028-11-01	2028	11	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.68	0.08	1.28	1.30	2026-01-25 01:08:15.360548+00
1332	2028-12-01	2028	12	Kiên Giang	Tân Hiệp	105.268781	10.097586	0.94	0.38	1.49	1.30	2026-01-25 01:08:15.360548+00
157	2026-01-01	2026	1	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.62	0.49	0.75	1.37	2026-01-24 13:09:14.587614+00
158	2026-02-01	2026	2	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.81	0.68	0.94	1.37	2026-01-24 13:09:14.587614+00
159	2026-03-01	2026	3	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.97	0.83	1.11	1.37	2026-01-24 13:09:14.587614+00
160	2026-04-01	2026	4	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.86	0.73	1.00	1.37	2026-01-24 13:09:14.587614+00
161	2026-05-01	2026	5	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.50	0.37	0.63	1.37	2026-01-24 13:09:14.587614+00
162	2026-06-01	2026	6	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.21	0.08	0.34	1.37	2026-01-24 13:09:14.587614+00
163	2026-07-01	2026	7	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.02	0.00	0.15	1.37	2026-01-24 13:09:14.587614+00
164	2026-08-01	2026	8	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.00	0.00	0.09	1.37	2026-01-24 13:09:14.587614+00
165	2026-09-01	2026	9	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.00	0.00	0.08	1.37	2026-01-24 13:09:14.587614+00
166	2026-10-01	2026	10	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.02	0.00	0.15	1.37	2026-01-24 13:09:14.587614+00
167	2026-11-01	2026	11	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.20	0.07	0.32	1.37	2026-01-24 13:09:14.587614+00
168	2026-12-01	2026	12	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.45	0.32	0.57	1.37	2026-01-24 13:09:14.587614+00
1345	2027-01-01	2027	1	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.62	0.49	0.75	1.37	2026-01-25 01:08:15.360548+00
1346	2027-02-01	2027	2	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.81	0.69	0.95	1.37	2026-01-25 01:08:15.360548+00
1347	2027-03-01	2027	3	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.94	0.80	1.08	1.37	2026-01-25 01:08:15.360548+00
1348	2027-04-01	2027	4	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.84	0.72	0.97	1.37	2026-01-25 01:08:15.360548+00
1349	2027-05-01	2027	5	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.49	0.36	0.61	1.37	2026-01-25 01:08:15.360548+00
1350	2027-06-01	2027	6	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.21	0.08	0.34	1.37	2026-01-25 01:08:15.360548+00
1351	2027-07-01	2027	7	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.02	0.00	0.15	1.37	2026-01-25 01:08:15.360548+00
1352	2027-08-01	2027	8	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.00	0.00	0.08	1.37	2026-01-25 01:08:15.360548+00
1353	2027-09-01	2027	9	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.00	0.00	0.07	1.37	2026-01-25 01:08:15.360548+00
1354	2027-10-01	2027	10	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.00	0.00	0.13	1.37	2026-01-25 01:08:15.360548+00
1355	2027-11-01	2027	11	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.17	0.05	0.30	1.37	2026-01-25 01:08:15.360548+00
1356	2027-12-01	2027	12	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.43	0.30	0.55	1.37	2026-01-25 01:08:15.360548+00
1357	2028-01-01	2028	1	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.65	0.53	0.79	1.37	2026-01-25 01:08:15.360548+00
1358	2028-02-01	2028	2	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.85	0.73	0.98	1.37	2026-01-25 01:08:15.360548+00
1359	2028-03-01	2028	3	Kiên Giang	Xẻo Rô	105.120000	9.880000	1.02	0.88	1.15	1.37	2026-01-25 01:08:15.360548+00
1360	2028-04-01	2028	4	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.88	0.75	1.02	1.37	2026-01-25 01:08:15.360548+00
1361	2028-05-01	2028	5	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.52	0.38	0.64	1.37	2026-01-25 01:08:15.360548+00
1362	2028-06-01	2028	6	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.20	0.07	0.33	1.37	2026-01-25 01:08:15.360548+00
1363	2028-07-01	2028	7	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.01	0.00	0.14	1.37	2026-01-25 01:08:15.360548+00
1364	2028-08-01	2028	8	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.00	0.00	0.10	1.37	2026-01-25 01:08:15.360548+00
1365	2028-09-01	2028	9	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.00	0.00	0.10	1.37	2026-01-25 01:08:15.360548+00
1366	2028-10-01	2028	10	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.04	0.00	0.18	1.37	2026-01-25 01:08:15.360548+00
1367	2028-11-01	2028	11	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.22	0.09	0.35	1.37	2026-01-25 01:08:15.360548+00
1368	2028-12-01	2028	12	Kiên Giang	Xẻo Rô	105.120000	9.880000	0.48	0.34	0.62	1.37	2026-01-25 01:08:15.360548+00
169	2026-01-01	2026	1	Long An	Cầu Nổi	106.550000	10.516000	1.54	0.86	2.21	0.85	2026-01-24 13:09:14.587614+00
170	2026-02-01	2026	2	Long An	Cầu Nổi	106.550000	10.516000	1.91	1.26	2.59	0.85	2026-01-24 13:09:14.587614+00
171	2026-03-01	2026	3	Long An	Cầu Nổi	106.550000	10.516000	2.31	1.67	3.00	0.85	2026-01-24 13:09:14.587614+00
172	2026-04-01	2026	4	Long An	Cầu Nổi	106.550000	10.516000	2.09	1.43	2.75	0.85	2026-01-24 13:09:14.587614+00
173	2026-05-01	2026	5	Long An	Cầu Nổi	106.550000	10.516000	1.34	0.64	2.00	0.85	2026-01-24 13:09:14.587614+00
174	2026-06-01	2026	6	Long An	Cầu Nổi	106.550000	10.516000	0.66	0.00	1.41	0.85	2026-01-24 13:09:14.587614+00
175	2026-07-01	2026	7	Long An	Cầu Nổi	106.550000	10.516000	0.27	0.00	0.93	0.85	2026-01-24 13:09:14.587614+00
176	2026-08-01	2026	8	Long An	Cầu Nổi	106.550000	10.516000	0.12	0.00	0.77	0.85	2026-01-24 13:09:14.587614+00
177	2026-09-01	2026	9	Long An	Cầu Nổi	106.550000	10.516000	0.10	0.00	0.67	0.85	2026-01-24 13:09:14.587614+00
178	2026-10-01	2026	10	Long An	Cầu Nổi	106.550000	10.516000	0.20	0.00	0.88	0.85	2026-01-24 13:09:14.587614+00
179	2026-11-01	2026	11	Long An	Cầu Nổi	106.550000	10.516000	0.58	0.00	1.28	0.85	2026-01-24 13:09:14.587614+00
180	2026-12-01	2026	12	Long An	Cầu Nổi	106.550000	10.516000	1.11	0.42	1.78	0.85	2026-01-24 13:09:14.587614+00
1381	2027-01-01	2027	1	Long An	Cầu Nổi	106.550000	10.516000	1.83	1.16	2.49	0.85	2026-01-25 01:08:15.360548+00
1382	2027-02-01	2027	2	Long An	Cầu Nổi	106.550000	10.516000	2.26	1.60	2.90	0.85	2026-01-25 01:08:15.360548+00
1383	2027-03-01	2027	3	Long An	Cầu Nổi	106.550000	10.516000	2.25	1.62	2.94	0.85	2026-01-25 01:08:15.360548+00
1384	2027-04-01	2027	4	Long An	Cầu Nổi	106.550000	10.516000	2.13	1.47	2.77	0.85	2026-01-25 01:08:15.360548+00
1385	2027-05-01	2027	5	Long An	Cầu Nổi	106.550000	10.516000	1.47	0.75	2.15	0.85	2026-01-25 01:08:15.360548+00
1386	2027-06-01	2027	6	Long An	Cầu Nổi	106.550000	10.516000	0.83	0.16	1.53	0.85	2026-01-25 01:08:15.360548+00
1387	2027-07-01	2027	7	Long An	Cầu Nổi	106.550000	10.516000	0.45	0.00	1.13	0.85	2026-01-25 01:08:15.360548+00
1388	2027-08-01	2027	8	Long An	Cầu Nổi	106.550000	10.516000	0.29	0.00	0.94	0.85	2026-01-25 01:08:15.360548+00
1389	2027-09-01	2027	9	Long An	Cầu Nổi	106.550000	10.516000	0.23	0.00	0.92	0.85	2026-01-25 01:08:15.360548+00
1390	2027-10-01	2027	10	Long An	Cầu Nổi	106.550000	10.516000	0.28	0.00	0.96	0.85	2026-01-25 01:08:15.360548+00
1391	2027-11-01	2027	11	Long An	Cầu Nổi	106.550000	10.516000	0.62	0.00	1.27	0.85	2026-01-25 01:08:15.360548+00
1392	2027-12-01	2027	12	Long An	Cầu Nổi	106.550000	10.516000	1.11	0.42	1.78	0.85	2026-01-25 01:08:15.360548+00
1393	2028-01-01	2028	1	Long An	Cầu Nổi	106.550000	10.516000	1.75	1.08	2.46	0.85	2026-01-25 01:08:15.360548+00
1394	2028-02-01	2028	2	Long An	Cầu Nổi	106.550000	10.516000	2.23	1.59	2.92	0.85	2026-01-25 01:08:15.360548+00
1395	2028-03-01	2028	3	Long An	Cầu Nổi	106.550000	10.516000	2.56	1.90	3.28	0.85	2026-01-25 01:08:15.360548+00
1396	2028-04-01	2028	4	Long An	Cầu Nổi	106.550000	10.516000	2.15	1.46	2.83	0.85	2026-01-25 01:08:15.360548+00
1397	2028-05-01	2028	5	Long An	Cầu Nổi	106.550000	10.516000	1.23	0.58	1.92	0.85	2026-01-25 01:08:15.360548+00
1398	2028-06-01	2028	6	Long An	Cầu Nổi	106.550000	10.516000	0.45	0.00	1.11	0.85	2026-01-25 01:08:15.360548+00
1399	2028-07-01	2028	7	Long An	Cầu Nổi	106.550000	10.516000	0.02	0.00	0.69	0.85	2026-01-25 01:08:15.360548+00
1400	2028-08-01	2028	8	Long An	Cầu Nổi	106.550000	10.516000	0.00	0.00	0.63	0.85	2026-01-25 01:08:15.360548+00
1401	2028-09-01	2028	9	Long An	Cầu Nổi	106.550000	10.516000	0.00	0.00	0.65	0.85	2026-01-25 01:08:15.360548+00
1402	2028-10-01	2028	10	Long An	Cầu Nổi	106.550000	10.516000	0.16	0.00	0.86	0.85	2026-01-25 01:08:15.360548+00
1403	2028-11-01	2028	11	Long An	Cầu Nổi	106.550000	10.516000	0.63	0.00	1.27	0.85	2026-01-25 01:08:15.360548+00
1404	2028-12-01	2028	12	Long An	Cầu Nổi	106.550000	10.516000	1.25	0.58	1.91	0.85	2026-01-25 01:08:15.360548+00
181	2026-01-01	2026	1	Long An	Tân An	106.378900	10.552117	1.91	0.94	2.82	0.85	2026-01-24 13:09:14.587614+00
182	2026-02-01	2026	2	Long An	Tân An	106.378900	10.552117	2.37	1.45	3.28	0.85	2026-01-24 13:09:14.587614+00
183	2026-03-01	2026	3	Long An	Tân An	106.378900	10.552117	2.82	1.88	3.72	0.85	2026-01-24 13:09:14.587614+00
184	2026-04-01	2026	4	Long An	Tân An	106.378900	10.552117	2.54	1.51	3.46	0.85	2026-01-24 13:09:14.587614+00
185	2026-05-01	2026	5	Long An	Tân An	106.378900	10.552117	1.73	0.84	2.67	0.85	2026-01-24 13:09:14.587614+00
186	2026-06-01	2026	6	Long An	Tân An	106.378900	10.552117	1.05	0.04	1.91	0.85	2026-01-24 13:09:14.587614+00
187	2026-07-01	2026	7	Long An	Tân An	106.378900	10.552117	0.62	0.00	1.58	0.85	2026-01-24 13:09:14.587614+00
188	2026-08-01	2026	8	Long An	Tân An	106.378900	10.552117	0.45	0.00	1.40	0.85	2026-01-24 13:09:14.587614+00
189	2026-09-01	2026	9	Long An	Tân An	106.378900	10.552117	0.43	0.00	1.33	0.85	2026-01-24 13:09:14.587614+00
190	2026-10-01	2026	10	Long An	Tân An	106.378900	10.552117	0.56	0.00	1.53	0.85	2026-01-24 13:09:14.587614+00
191	2026-11-01	2026	11	Long An	Tân An	106.378900	10.552117	0.97	0.00	1.91	0.85	2026-01-24 13:09:14.587614+00
192	2026-12-01	2026	12	Long An	Tân An	106.378900	10.552117	1.56	0.69	2.49	0.85	2026-01-24 13:09:14.587614+00
1417	2027-01-01	2027	1	Long An	Tân An	106.378900	10.552117	2.33	1.48	3.31	0.85	2026-01-25 01:08:15.360548+00
1418	2027-02-01	2027	2	Long An	Tân An	106.378900	10.552117	2.89	1.93	3.80	0.85	2026-01-25 01:08:15.360548+00
1419	2027-03-01	2027	3	Long An	Tân An	106.378900	10.552117	2.86	1.94	3.82	0.85	2026-01-25 01:08:15.360548+00
1420	2027-04-01	2027	4	Long An	Tân An	106.378900	10.552117	2.59	1.69	3.52	0.85	2026-01-25 01:08:15.360548+00
1421	2027-05-01	2027	5	Long An	Tân An	106.378900	10.552117	1.97	1.04	2.90	0.85	2026-01-25 01:08:15.360548+00
1422	2027-06-01	2027	6	Long An	Tân An	106.378900	10.552117	1.36	0.43	2.37	0.85	2026-01-25 01:08:15.360548+00
1423	2027-07-01	2027	7	Long An	Tân An	106.378900	10.552117	0.94	0.04	1.91	0.85	2026-01-25 01:08:15.360548+00
1424	2027-08-01	2027	8	Long An	Tân An	106.378900	10.552117	0.73	0.00	1.67	0.85	2026-01-25 01:08:15.360548+00
1425	2027-09-01	2027	9	Long An	Tân An	106.378900	10.552117	0.66	0.00	1.67	0.85	2026-01-25 01:08:15.360548+00
1426	2027-10-01	2027	10	Long An	Tân An	106.378900	10.552117	0.74	0.00	1.71	0.85	2026-01-25 01:08:15.360548+00
1427	2027-11-01	2027	11	Long An	Tân An	106.378900	10.552117	1.10	0.15	2.07	0.85	2026-01-25 01:08:15.360548+00
1428	2027-12-01	2027	12	Long An	Tân An	106.378900	10.552117	1.64	0.72	2.54	0.85	2026-01-25 01:08:15.360548+00
1429	2028-01-01	2028	1	Long An	Tân An	106.378900	10.552117	2.37	1.37	3.30	0.85	2026-01-25 01:08:15.360548+00
1430	2028-02-01	2028	2	Long An	Tân An	106.378900	10.552117	3.03	2.10	3.98	0.85	2026-01-25 01:08:15.360548+00
1431	2028-03-01	2028	3	Long An	Tân An	106.378900	10.552117	3.27	2.29	4.31	0.85	2026-01-25 01:08:15.360548+00
1432	2028-04-01	2028	4	Long An	Tân An	106.378900	10.552117	3.00	2.04	3.93	0.85	2026-01-25 01:08:15.360548+00
1433	2028-05-01	2028	5	Long An	Tân An	106.378900	10.552117	1.81	0.84	2.75	0.85	2026-01-25 01:08:15.360548+00
1434	2028-06-01	2028	6	Long An	Tân An	106.378900	10.552117	0.99	0.02	1.98	0.85	2026-01-25 01:08:15.360548+00
1435	2028-07-01	2028	7	Long An	Tân An	106.378900	10.552117	0.53	0.00	1.48	0.85	2026-01-25 01:08:15.360548+00
1436	2028-08-01	2028	8	Long An	Tân An	106.378900	10.552117	0.44	0.00	1.38	0.85	2026-01-25 01:08:15.360548+00
1437	2028-09-01	2028	9	Long An	Tân An	106.378900	10.552117	0.51	0.00	1.49	0.85	2026-01-25 01:08:15.360548+00
1438	2028-10-01	2028	10	Long An	Tân An	106.378900	10.552117	0.74	0.00	1.72	0.85	2026-01-25 01:08:15.360548+00
1439	2028-11-01	2028	11	Long An	Tân An	106.378900	10.552117	1.28	0.31	2.22	0.85	2026-01-25 01:08:15.360548+00
1440	2028-12-01	2028	12	Long An	Tân An	106.378900	10.552117	1.97	0.98	2.91	0.85	2026-01-25 01:08:15.360548+00
193	2026-01-01	2026	1	Sóc Trăng	Trần Đề	106.185000	9.485000	3.75	2.34	5.10	1.49	2026-01-24 13:09:14.587614+00
194	2026-02-01	2026	2	Sóc Trăng	Trần Đề	106.185000	9.485000	4.95	3.55	6.38	1.49	2026-01-24 13:09:14.587614+00
195	2026-03-01	2026	3	Sóc Trăng	Trần Đề	106.185000	9.485000	6.05	4.69	7.38	1.49	2026-01-24 13:09:14.587614+00
196	2026-04-01	2026	4	Sóc Trăng	Trần Đề	106.185000	9.485000	5.32	3.91	6.70	1.49	2026-01-24 13:09:14.587614+00
197	2026-05-01	2026	5	Sóc Trăng	Trần Đề	106.185000	9.485000	2.87	1.38	4.16	1.49	2026-01-24 13:09:14.587614+00
198	2026-06-01	2026	6	Sóc Trăng	Trần Đề	106.185000	9.485000	0.92	0.00	2.42	1.49	2026-01-24 13:09:14.587614+00
199	2026-07-01	2026	7	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	1.06	1.49	2026-01-24 13:09:14.587614+00
200	2026-08-01	2026	8	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.68	1.49	2026-01-24 13:09:14.587614+00
201	2026-09-01	2026	9	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.67	1.49	2026-01-24 13:09:14.587614+00
202	2026-10-01	2026	10	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	1.13	1.49	2026-01-24 13:09:14.587614+00
203	2026-11-01	2026	11	Sóc Trăng	Trần Đề	106.185000	9.485000	0.81	0.00	2.30	1.49	2026-01-24 13:09:14.587614+00
204	2026-12-01	2026	12	Sóc Trăng	Trần Đề	106.185000	9.485000	2.38	1.04	3.78	1.49	2026-01-24 13:09:14.587614+00
1453	2027-01-01	2027	1	Sóc Trăng	Trần Đề	106.185000	9.485000	3.48	2.19	4.87	1.49	2026-01-25 01:08:15.360548+00
1454	2027-02-01	2027	2	Sóc Trăng	Trần Đề	106.185000	9.485000	4.68	3.20	6.11	1.49	2026-01-25 01:08:15.360548+00
1455	2027-03-01	2027	3	Sóc Trăng	Trần Đề	106.185000	9.485000	5.81	4.34	7.12	1.49	2026-01-25 01:08:15.360548+00
1456	2027-04-01	2027	4	Sóc Trăng	Trần Đề	106.185000	9.485000	5.09	3.74	6.42	1.49	2026-01-25 01:08:15.360548+00
1457	2027-05-01	2027	5	Sóc Trăng	Trần Đề	106.185000	9.485000	2.62	1.23	3.98	1.49	2026-01-25 01:08:15.360548+00
1458	2027-06-01	2027	6	Sóc Trăng	Trần Đề	106.185000	9.485000	0.68	0.00	1.98	1.49	2026-01-25 01:08:15.360548+00
1459	2027-07-01	2027	7	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.92	1.49	2026-01-25 01:08:15.360548+00
1460	2027-08-01	2027	8	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.46	1.49	2026-01-25 01:08:15.360548+00
1461	2027-09-01	2027	9	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.37	1.49	2026-01-25 01:08:15.360548+00
1462	2027-10-01	2027	10	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.79	1.49	2026-01-25 01:08:15.360548+00
1463	2027-11-01	2027	11	Sóc Trăng	Trần Đề	106.185000	9.485000	0.53	0.00	1.83	1.49	2026-01-25 01:08:15.360548+00
1464	2027-12-01	2027	12	Sóc Trăng	Trần Đề	106.185000	9.485000	2.12	0.65	3.48	1.49	2026-01-25 01:08:15.360548+00
1465	2028-01-01	2028	1	Sóc Trăng	Trần Đề	106.185000	9.485000	3.46	2.03	4.91	1.49	2026-01-25 01:08:15.360548+00
1466	2028-02-01	2028	2	Sóc Trăng	Trần Đề	106.185000	9.485000	4.66	3.29	5.99	1.49	2026-01-25 01:08:15.360548+00
1467	2028-03-01	2028	3	Sóc Trăng	Trần Đề	106.185000	9.485000	5.77	4.37	7.19	1.49	2026-01-25 01:08:15.360548+00
1468	2028-04-01	2028	4	Sóc Trăng	Trần Đề	106.185000	9.485000	5.02	3.63	6.36	1.49	2026-01-25 01:08:15.360548+00
1469	2028-05-01	2028	5	Sóc Trăng	Trần Đề	106.185000	9.485000	2.61	1.26	3.89	1.49	2026-01-25 01:08:15.360548+00
1470	2028-06-01	2028	6	Sóc Trăng	Trần Đề	106.185000	9.485000	0.64	0.00	2.01	1.49	2026-01-25 01:08:15.360548+00
1471	2028-07-01	2028	7	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.83	1.49	2026-01-25 01:08:15.360548+00
1472	2028-08-01	2028	8	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.43	1.49	2026-01-25 01:08:15.360548+00
1473	2028-09-01	2028	9	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.37	1.49	2026-01-25 01:08:15.360548+00
1474	2028-10-01	2028	10	Sóc Trăng	Trần Đề	106.185000	9.485000	0.00	0.00	0.92	1.49	2026-01-25 01:08:15.360548+00
1475	2028-11-01	2028	11	Sóc Trăng	Trần Đề	106.185000	9.485000	0.60	0.00	2.00	1.49	2026-01-25 01:08:15.360548+00
1476	2028-12-01	2028	12	Sóc Trăng	Trần Đề	106.185000	9.485000	2.12	0.74	3.53	1.49	2026-01-25 01:08:15.360548+00
205	2026-01-01	2026	1	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.59	0.32	0.86	1.37	2026-01-24 13:09:14.587614+00
206	2026-02-01	2026	2	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.70	0.41	0.96	1.37	2026-01-24 13:09:14.587614+00
207	2026-03-01	2026	3	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.85	0.55	1.11	1.37	2026-01-24 13:09:14.587614+00
208	2026-04-01	2026	4	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.79	0.52	1.05	1.37	2026-01-24 13:09:14.587614+00
209	2026-05-01	2026	5	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.53	0.28	0.80	1.37	2026-01-24 13:09:14.587614+00
210	2026-06-01	2026	6	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.31	0.05	0.56	1.37	2026-01-24 13:09:14.587614+00
211	2026-07-01	2026	7	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.17	0.00	0.42	1.37	2026-01-24 13:09:14.587614+00
212	2026-08-01	2026	8	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.12	0.00	0.38	1.37	2026-01-24 13:09:14.587614+00
213	2026-09-01	2026	9	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.11	0.00	0.38	1.37	2026-01-24 13:09:14.587614+00
214	2026-10-01	2026	10	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.15	0.00	0.41	1.37	2026-01-24 13:09:14.587614+00
215	2026-11-01	2026	11	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.29	0.02	0.53	1.37	2026-01-24 13:09:14.587614+00
216	2026-12-01	2026	12	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.47	0.22	0.74	1.37	2026-01-24 13:09:14.587614+00
1489	2027-01-01	2027	1	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.65	0.37	0.90	1.37	2026-01-25 01:08:15.360548+00
1490	2027-02-01	2027	2	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.82	0.57	1.08	1.37	2026-01-25 01:08:15.360548+00
1491	2027-03-01	2027	3	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.77	0.50	1.02	1.37	2026-01-25 01:08:15.360548+00
1492	2027-04-01	2027	4	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.75	0.45	1.02	1.37	2026-01-25 01:08:15.360548+00
1493	2027-05-01	2027	5	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.54	0.26	0.80	1.37	2026-01-25 01:08:15.360548+00
1494	2027-06-01	2027	6	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.34	0.06	0.62	1.37	2026-01-25 01:08:15.360548+00
1495	2027-07-01	2027	7	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.20	0.00	0.46	1.37	2026-01-25 01:08:15.360548+00
1496	2027-08-01	2027	8	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.14	0.00	0.41	1.37	2026-01-25 01:08:15.360548+00
1497	2027-09-01	2027	9	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.11	0.00	0.39	1.37	2026-01-25 01:08:15.360548+00
1498	2027-10-01	2027	10	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.14	0.00	0.39	1.37	2026-01-25 01:08:15.360548+00
1499	2027-11-01	2027	11	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.25	0.00	0.52	1.37	2026-01-25 01:08:15.360548+00
1500	2027-12-01	2027	12	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.42	0.17	0.70	1.37	2026-01-25 01:08:15.360548+00
1501	2028-01-01	2028	1	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.78	0.50	1.05	1.37	2026-01-25 01:08:15.360548+00
1502	2028-02-01	2028	2	Sóc Trăng	Đại Ngãi	106.125000	9.615000	1.00	0.72	1.26	1.37	2026-01-25 01:08:15.360548+00
1503	2028-03-01	2028	3	Sóc Trăng	Đại Ngãi	106.125000	9.615000	1.09	0.83	1.37	1.37	2026-01-25 01:08:15.360548+00
1504	2028-04-01	2028	4	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.97	0.69	1.23	1.37	2026-01-25 01:08:15.360548+00
1505	2028-05-01	2028	5	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.62	0.36	0.90	1.37	2026-01-25 01:08:15.360548+00
1506	2028-06-01	2028	6	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.33	0.09	0.60	1.37	2026-01-25 01:08:15.360548+00
1507	2028-07-01	2028	7	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.19	0.00	0.45	1.37	2026-01-25 01:08:15.360548+00
1508	2028-08-01	2028	8	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.15	0.00	0.42	1.37	2026-01-25 01:08:15.360548+00
1509	2028-09-01	2028	9	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.19	0.00	0.46	1.37	2026-01-25 01:08:15.360548+00
1510	2028-10-01	2028	10	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.26	0.01	0.51	1.37	2026-01-25 01:08:15.360548+00
1511	2028-11-01	2028	11	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.43	0.17	0.70	1.37	2026-01-25 01:08:15.360548+00
1512	2028-12-01	2028	12	Sóc Trăng	Đại Ngãi	106.125000	9.615000	0.66	0.37	0.93	1.37	2026-01-25 01:08:15.360548+00
217	2026-01-01	2026	1	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.84	0.29	1.36	1.10	2026-01-24 13:09:14.587614+00
218	2026-02-01	2026	2	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.29	0.74	1.85	1.10	2026-01-24 13:09:14.587614+00
219	2026-03-01	2026	3	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.70	1.16	2.23	1.10	2026-01-24 13:09:14.587614+00
220	2026-04-01	2026	4	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.39	0.83	1.93	1.10	2026-01-24 13:09:14.587614+00
221	2026-05-01	2026	5	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.53	0.00	1.11	1.10	2026-01-24 13:09:14.587614+00
222	2026-06-01	2026	6	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	0.30	1.10	2026-01-24 13:09:14.587614+00
223	2026-07-01	2026	7	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.13	1.10	2026-01-24 13:09:14.587614+00
224	2026-08-01	2026	8	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.27	1.10	2026-01-24 13:09:14.587614+00
225	2026-09-01	2026	9	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.34	1.10	2026-01-24 13:09:14.587614+00
226	2026-10-01	2026	10	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.16	1.10	2026-01-24 13:09:14.587614+00
227	2026-11-01	2026	11	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	0.28	1.10	2026-01-24 13:09:14.587614+00
228	2026-12-01	2026	12	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.32	0.00	0.85	1.10	2026-01-24 13:09:14.587614+00
1525	2027-01-01	2027	1	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.80	0.27	1.32	1.10	2026-01-25 01:08:15.360548+00
1526	2027-02-01	2027	2	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.26	0.72	1.79	1.10	2026-01-25 01:08:15.360548+00
1527	2027-03-01	2027	3	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.55	1.04	2.08	1.10	2026-01-25 01:08:15.360548+00
1528	2027-04-01	2027	4	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.29	0.75	1.79	1.10	2026-01-25 01:08:15.360548+00
1529	2027-05-01	2027	5	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.45	0.00	0.94	1.10	2026-01-25 01:08:15.360548+00
1530	2027-06-01	2027	6	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	0.28	1.10	2026-01-25 01:08:15.360548+00
1531	2027-07-01	2027	7	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.19	1.10	2026-01-25 01:08:15.360548+00
1532	2027-08-01	2027	8	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.36	1.10	2026-01-25 01:08:15.360548+00
1533	2027-09-01	2027	9	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.38	1.10	2026-01-25 01:08:15.360548+00
1534	2027-10-01	2027	10	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.28	1.10	2026-01-25 01:08:15.360548+00
1535	2027-11-01	2027	11	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	0.18	1.10	2026-01-25 01:08:15.360548+00
1536	2027-12-01	2027	12	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.21	0.00	0.73	1.10	2026-01-25 01:08:15.360548+00
1537	2028-01-01	2028	1	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.69	0.12	1.23	1.10	2026-01-25 01:08:15.360548+00
1538	2028-02-01	2028	2	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.15	0.60	1.69	1.10	2026-01-25 01:08:15.360548+00
1539	2028-03-01	2028	3	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.58	1.01	2.14	1.10	2026-01-25 01:08:15.360548+00
1540	2028-04-01	2028	4	Tiền Giang	Mỹ Tho	106.365000	10.355000	1.17	0.64	1.66	1.10	2026-01-25 01:08:15.360548+00
1541	2028-05-01	2028	5	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.27	0.00	0.84	1.10	2026-01-25 01:08:15.360548+00
1542	2028-06-01	2028	6	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	0.01	1.10	2026-01-25 01:08:15.360548+00
1543	2028-07-01	2028	7	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.41	1.10	2026-01-25 01:08:15.360548+00
1544	2028-08-01	2028	8	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.58	1.10	2026-01-25 01:08:15.360548+00
1545	2028-09-01	2028	9	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.54	1.10	2026-01-25 01:08:15.360548+00
1546	2028-10-01	2028	10	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	-0.40	1.10	2026-01-25 01:08:15.360548+00
1547	2028-11-01	2028	11	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.00	0.00	0.08	1.10	2026-01-25 01:08:15.360548+00
1548	2028-12-01	2028	12	Tiền Giang	Mỹ Tho	106.365000	10.355000	0.13	0.00	0.68	1.10	2026-01-25 01:08:15.360548+00
229	2026-01-01	2026	1	Tiền Giang	Vàm Kênh	106.738057	10.275536	3.97	2.85	5.00	1.10	2026-01-24 13:09:14.587614+00
230	2026-02-01	2026	2	Tiền Giang	Vàm Kênh	106.738057	10.275536	4.54	3.50	5.63	1.10	2026-01-24 13:09:14.587614+00
231	2026-03-01	2026	3	Tiền Giang	Vàm Kênh	106.738057	10.275536	5.12	4.01	6.27	1.10	2026-01-24 13:09:14.587614+00
232	2026-04-01	2026	4	Tiền Giang	Vàm Kênh	106.738057	10.275536	4.80	3.72	5.97	1.10	2026-01-24 13:09:14.587614+00
233	2026-05-01	2026	5	Tiền Giang	Vàm Kênh	106.738057	10.275536	3.54	2.50	4.69	1.10	2026-01-24 13:09:14.587614+00
234	2026-06-01	2026	6	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.57	1.52	3.78	1.10	2026-01-24 13:09:14.587614+00
235	2026-07-01	2026	7	Tiền Giang	Vàm Kênh	106.738057	10.275536	1.98	0.84	3.03	1.10	2026-01-24 13:09:14.587614+00
236	2026-08-01	2026	8	Tiền Giang	Vàm Kênh	106.738057	10.275536	1.78	0.72	2.91	1.10	2026-01-24 13:09:14.587614+00
237	2026-09-01	2026	9	Tiền Giang	Vàm Kênh	106.738057	10.275536	1.78	0.60	2.81	1.10	2026-01-24 13:09:14.587614+00
238	2026-10-01	2026	10	Tiền Giang	Vàm Kênh	106.738057	10.275536	1.98	0.89	2.95	1.10	2026-01-24 13:09:14.587614+00
239	2026-11-01	2026	11	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.57	1.50	3.62	1.10	2026-01-24 13:09:14.587614+00
240	2026-12-01	2026	12	Tiền Giang	Vàm Kênh	106.738057	10.275536	3.39	2.25	4.43	1.10	2026-01-24 13:09:14.587614+00
1561	2027-01-01	2027	1	Tiền Giang	Vàm Kênh	106.738057	10.275536	4.02	2.94	5.13	1.10	2026-01-25 01:08:15.360548+00
1562	2027-02-01	2027	2	Tiền Giang	Vàm Kênh	106.738057	10.275536	4.57	3.45	5.68	1.10	2026-01-25 01:08:15.360548+00
1563	2027-03-01	2027	3	Tiền Giang	Vàm Kênh	106.738057	10.275536	5.19	4.01	6.30	1.10	2026-01-25 01:08:15.360548+00
1564	2027-04-01	2027	4	Tiền Giang	Vàm Kênh	106.738057	10.275536	4.87	3.77	5.96	1.10	2026-01-25 01:08:15.360548+00
1565	2027-05-01	2027	5	Tiền Giang	Vàm Kênh	106.738057	10.275536	3.59	2.54	4.69	1.10	2026-01-25 01:08:15.360548+00
1566	2027-06-01	2027	6	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.62	1.52	3.68	1.10	2026-01-25 01:08:15.360548+00
1567	2027-07-01	2027	7	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.03	0.94	3.09	1.10	2026-01-25 01:08:15.360548+00
1568	2027-08-01	2027	8	Tiền Giang	Vàm Kênh	106.738057	10.275536	1.84	0.74	2.94	1.10	2026-01-25 01:08:15.360548+00
1569	2027-09-01	2027	9	Tiền Giang	Vàm Kênh	106.738057	10.275536	1.84	0.76	2.98	1.10	2026-01-25 01:08:15.360548+00
1570	2027-10-01	2027	10	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.03	0.91	3.22	1.10	2026-01-25 01:08:15.360548+00
1571	2027-11-01	2027	11	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.62	1.48	3.71	1.10	2026-01-25 01:08:15.360548+00
1572	2027-12-01	2027	12	Tiền Giang	Vàm Kênh	106.738057	10.275536	3.44	2.37	4.49	1.10	2026-01-25 01:08:15.360548+00
1573	2028-01-01	2028	1	Tiền Giang	Vàm Kênh	106.738057	10.275536	4.26	3.25	5.32	1.10	2026-01-25 01:08:15.360548+00
1574	2028-02-01	2028	2	Tiền Giang	Vàm Kênh	106.738057	10.275536	4.81	3.73	5.94	1.10	2026-01-25 01:08:15.360548+00
1575	2028-03-01	2028	3	Tiền Giang	Vàm Kênh	106.738057	10.275536	5.40	4.28	6.47	1.10	2026-01-25 01:08:15.360548+00
1576	2028-04-01	2028	4	Tiền Giang	Vàm Kênh	106.738057	10.275536	5.07	3.98	6.17	1.10	2026-01-25 01:08:15.360548+00
1577	2028-05-01	2028	5	Tiền Giang	Vàm Kênh	106.738057	10.275536	3.84	2.77	5.03	1.10	2026-01-25 01:08:15.360548+00
1578	2028-06-01	2028	6	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.87	1.76	3.93	1.10	2026-01-25 01:08:15.360548+00
1579	2028-07-01	2028	7	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.27	1.26	3.34	1.10	2026-01-25 01:08:15.360548+00
1580	2028-08-01	2028	8	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.07	0.96	3.16	1.10	2026-01-25 01:08:15.360548+00
1581	2028-09-01	2028	9	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.07	0.95	3.15	1.10	2026-01-25 01:08:15.360548+00
1582	2028-10-01	2028	10	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.30	1.14	3.36	1.10	2026-01-25 01:08:15.360548+00
1583	2028-11-01	2028	11	Tiền Giang	Vàm Kênh	106.738057	10.275536	2.89	1.78	4.05	1.10	2026-01-25 01:08:15.360548+00
1584	2028-12-01	2028	12	Tiền Giang	Vàm Kênh	106.738057	10.275536	3.71	2.65	4.82	1.10	2026-01-25 01:08:15.360548+00
241	2026-01-01	2026	1	Trà Vinh	Cầu Quan	106.200000	9.750000	0.25	0.00	0.78	1.37	2026-01-24 13:09:14.587614+00
242	2026-02-01	2026	2	Trà Vinh	Cầu Quan	106.200000	9.750000	0.45	0.00	1.00	1.37	2026-01-24 13:09:14.587614+00
243	2026-03-01	2026	3	Trà Vinh	Cầu Quan	106.200000	9.750000	0.68	0.12	1.15	1.37	2026-01-24 13:09:14.587614+00
244	2026-04-01	2026	4	Trà Vinh	Cầu Quan	106.200000	9.750000	0.56	0.03	1.07	1.37	2026-01-24 13:09:14.587614+00
245	2026-05-01	2026	5	Trà Vinh	Cầu Quan	106.200000	9.750000	0.14	0.00	0.64	1.37	2026-01-24 13:09:14.587614+00
246	2026-06-01	2026	6	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.29	1.37	2026-01-24 13:09:14.587614+00
247	2026-07-01	2026	7	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.06	1.37	2026-01-24 13:09:14.587614+00
248	2026-08-01	2026	8	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	-0.02	1.37	2026-01-24 13:09:14.587614+00
249	2026-09-01	2026	9	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	-0.03	1.37	2026-01-24 13:09:14.587614+00
250	2026-10-01	2026	10	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.03	1.37	2026-01-24 13:09:14.587614+00
251	2026-11-01	2026	11	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.26	1.37	2026-01-24 13:09:14.587614+00
252	2026-12-01	2026	12	Trà Vinh	Cầu Quan	106.200000	9.750000	0.03	0.00	0.57	1.37	2026-01-24 13:09:14.587614+00
1597	2027-01-01	2027	1	Trà Vinh	Cầu Quan	106.200000	9.750000	0.33	0.00	0.85	1.37	2026-01-25 01:08:15.360548+00
1598	2027-02-01	2027	2	Trà Vinh	Cầu Quan	106.200000	9.750000	0.60	0.10	1.12	1.37	2026-01-25 01:08:15.360548+00
1599	2027-03-01	2027	3	Trà Vinh	Cầu Quan	106.200000	9.750000	0.54	0.00	1.10	1.37	2026-01-25 01:08:15.360548+00
1600	2027-04-01	2027	4	Trà Vinh	Cầu Quan	106.200000	9.750000	0.49	0.00	1.02	1.37	2026-01-25 01:08:15.360548+00
1601	2027-05-01	2027	5	Trà Vinh	Cầu Quan	106.200000	9.750000	0.14	0.00	0.65	1.37	2026-01-25 01:08:15.360548+00
1602	2027-06-01	2027	6	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.33	1.37	2026-01-25 01:08:15.360548+00
1603	2027-07-01	2027	7	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.11	1.37	2026-01-25 01:08:15.360548+00
1604	2027-08-01	2027	8	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	-0.01	1.37	2026-01-25 01:08:15.360548+00
1605	2027-09-01	2027	9	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	-0.04	1.37	2026-01-25 01:08:15.360548+00
1606	2027-10-01	2027	10	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.05	1.37	2026-01-25 01:08:15.360548+00
1607	2027-11-01	2027	11	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.19	1.37	2026-01-25 01:08:15.360548+00
1608	2027-12-01	2027	12	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.48	1.37	2026-01-25 01:08:15.360548+00
1609	2028-01-01	2028	1	Trà Vinh	Cầu Quan	106.200000	9.750000	0.31	0.00	0.84	1.37	2026-01-25 01:08:15.360548+00
1610	2028-02-01	2028	2	Trà Vinh	Cầu Quan	106.200000	9.750000	0.65	0.15	1.20	1.37	2026-01-25 01:08:15.360548+00
1611	2028-03-01	2028	3	Trà Vinh	Cầu Quan	106.200000	9.750000	0.83	0.33	1.39	1.37	2026-01-25 01:08:15.360548+00
1612	2028-04-01	2028	4	Trà Vinh	Cầu Quan	106.200000	9.750000	0.59	0.08	1.12	1.37	2026-01-25 01:08:15.360548+00
1613	2028-05-01	2028	5	Trà Vinh	Cầu Quan	106.200000	9.750000	0.01	0.00	0.52	1.37	2026-01-25 01:08:15.360548+00
1614	2028-06-01	2028	6	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.11	1.37	2026-01-25 01:08:15.360548+00
1615	2028-07-01	2028	7	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	-0.13	1.37	2026-01-25 01:08:15.360548+00
1616	2028-08-01	2028	8	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	-0.15	1.37	2026-01-25 01:08:15.360548+00
1617	2028-09-01	2028	9	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	-0.17	1.37	2026-01-25 01:08:15.360548+00
1618	2028-10-01	2028	10	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	-0.01	1.37	2026-01-25 01:08:15.360548+00
1619	2028-11-01	2028	11	Trà Vinh	Cầu Quan	106.200000	9.750000	0.00	0.00	0.21	1.37	2026-01-25 01:08:15.360548+00
1620	2028-12-01	2028	12	Trà Vinh	Cầu Quan	106.200000	9.750000	0.04	0.00	0.55	1.37	2026-01-25 01:08:15.360548+00
253	2026-01-01	2026	1	Trà Vinh	Trà Vinh	106.345000	9.935000	4.39	3.51	5.25	1.37	2026-01-24 13:09:14.587614+00
254	2026-02-01	2026	2	Trà Vinh	Trà Vinh	106.345000	9.935000	5.18	4.37	6.19	1.37	2026-01-24 13:09:14.587614+00
255	2026-03-01	2026	3	Trà Vinh	Trà Vinh	106.345000	9.935000	6.04	5.09	6.89	1.37	2026-01-24 13:09:14.587614+00
256	2026-04-01	2026	4	Trà Vinh	Trà Vinh	106.345000	9.935000	5.56	4.64	6.47	1.37	2026-01-24 13:09:14.587614+00
257	2026-05-01	2026	5	Trà Vinh	Trà Vinh	106.345000	9.935000	3.85	2.99	4.70	1.37	2026-01-24 13:09:14.587614+00
258	2026-06-01	2026	6	Trà Vinh	Trà Vinh	106.345000	9.935000	2.37	1.50	3.29	1.37	2026-01-24 13:09:14.587614+00
259	2026-07-01	2026	7	Trà Vinh	Trà Vinh	106.345000	9.935000	1.52	0.65	2.45	1.37	2026-01-24 13:09:14.587614+00
260	2026-08-01	2026	8	Trà Vinh	Trà Vinh	106.345000	9.935000	1.22	0.29	2.14	1.37	2026-01-24 13:09:14.587614+00
261	2026-09-01	2026	9	Trà Vinh	Trà Vinh	106.345000	9.935000	1.21	0.30	2.10	1.37	2026-01-24 13:09:14.587614+00
262	2026-10-01	2026	10	Trà Vinh	Trà Vinh	106.345000	9.935000	1.47	0.59	2.34	1.37	2026-01-24 13:09:14.587614+00
263	2026-11-01	2026	11	Trà Vinh	Trà Vinh	106.345000	9.935000	2.31	1.38	3.26	1.37	2026-01-24 13:09:14.587614+00
264	2026-12-01	2026	12	Trà Vinh	Trà Vinh	106.345000	9.935000	3.47	2.58	4.36	1.37	2026-01-24 13:09:14.587614+00
1633	2027-01-01	2027	1	Trà Vinh	Trà Vinh	106.345000	9.935000	4.46	3.58	5.37	1.37	2026-01-25 01:08:15.360548+00
1634	2027-02-01	2027	2	Trà Vinh	Trà Vinh	106.345000	9.935000	5.31	4.35	6.30	1.37	2026-01-25 01:08:15.360548+00
1635	2027-03-01	2027	3	Trà Vinh	Trà Vinh	106.345000	9.935000	5.90	4.96	6.76	1.37	2026-01-25 01:08:15.360548+00
1636	2027-04-01	2027	4	Trà Vinh	Trà Vinh	106.345000	9.935000	5.53	4.62	6.41	1.37	2026-01-25 01:08:15.360548+00
1637	2027-05-01	2027	5	Trà Vinh	Trà Vinh	106.345000	9.935000	3.87	3.03	4.80	1.37	2026-01-25 01:08:15.360548+00
1638	2027-06-01	2027	6	Trà Vinh	Trà Vinh	106.345000	9.935000	2.39	1.48	3.24	1.37	2026-01-25 01:08:15.360548+00
1639	2027-07-01	2027	7	Trà Vinh	Trà Vinh	106.345000	9.935000	1.55	0.64	2.45	1.37	2026-01-25 01:08:15.360548+00
1640	2027-08-01	2027	8	Trà Vinh	Trà Vinh	106.345000	9.935000	1.25	0.36	2.09	1.37	2026-01-25 01:08:15.360548+00
1641	2027-09-01	2027	9	Trà Vinh	Trà Vinh	106.345000	9.935000	1.22	0.30	2.17	1.37	2026-01-25 01:08:15.360548+00
1642	2027-10-01	2027	10	Trà Vinh	Trà Vinh	106.345000	9.935000	1.43	0.52	2.26	1.37	2026-01-25 01:08:15.360548+00
1643	2027-11-01	2027	11	Trà Vinh	Trà Vinh	106.345000	9.935000	2.25	1.27	3.13	1.37	2026-01-25 01:08:15.360548+00
1644	2027-12-01	2027	12	Trà Vinh	Trà Vinh	106.345000	9.935000	3.40	2.50	4.32	1.37	2026-01-25 01:08:15.360548+00
1645	2028-01-01	2028	1	Trà Vinh	Trà Vinh	106.345000	9.935000	4.63	3.73	5.55	1.37	2026-01-25 01:08:15.360548+00
1646	2028-02-01	2028	2	Trà Vinh	Trà Vinh	106.345000	9.935000	5.53	4.59	6.45	1.37	2026-01-25 01:08:15.360548+00
1647	2028-03-01	2028	3	Trà Vinh	Trà Vinh	106.345000	9.935000	6.38	5.46	7.35	1.37	2026-01-25 01:08:15.360548+00
1648	2028-04-01	2028	4	Trà Vinh	Trà Vinh	106.345000	9.935000	5.70	4.76	6.58	1.37	2026-01-25 01:08:15.360548+00
1649	2028-05-01	2028	5	Trà Vinh	Trà Vinh	106.345000	9.935000	3.89	3.02	4.81	1.37	2026-01-25 01:08:15.360548+00
1650	2028-06-01	2028	6	Trà Vinh	Trà Vinh	106.345000	9.935000	2.41	1.52	3.32	1.37	2026-01-25 01:08:15.360548+00
1651	2028-07-01	2028	7	Trà Vinh	Trà Vinh	106.345000	9.935000	1.54	0.59	2.42	1.37	2026-01-25 01:08:15.360548+00
1652	2028-08-01	2028	8	Trà Vinh	Trà Vinh	106.345000	9.935000	1.24	0.32	2.14	1.37	2026-01-25 01:08:15.360548+00
1653	2028-09-01	2028	9	Trà Vinh	Trà Vinh	106.345000	9.935000	1.26	0.37	2.21	1.37	2026-01-25 01:08:15.360548+00
1654	2028-10-01	2028	10	Trà Vinh	Trà Vinh	106.345000	9.935000	1.61	0.71	2.56	1.37	2026-01-25 01:08:15.360548+00
1655	2028-11-01	2028	11	Trà Vinh	Trà Vinh	106.345000	9.935000	2.51	1.57	3.35	1.37	2026-01-25 01:08:15.360548+00
1656	2028-12-01	2028	12	Trà Vinh	Trà Vinh	106.345000	9.935000	3.69	2.82	4.64	1.37	2026-01-25 01:08:15.360548+00
265	2026-01-01	2026	1	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.18	0.00	0.68	1.16	2026-01-24 13:09:14.587614+00
266	2026-02-01	2026	2	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.40	0.00	0.95	1.16	2026-01-24 13:09:14.587614+00
267	2026-03-01	2026	3	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.65	0.12	1.19	1.16	2026-01-24 13:09:14.587614+00
268	2026-04-01	2026	4	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.54	0.03	1.03	1.16	2026-01-24 13:09:14.587614+00
269	2026-05-01	2026	5	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.06	0.00	0.57	1.16	2026-01-24 13:09:14.587614+00
270	2026-06-01	2026	6	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.17	1.16	2026-01-24 13:09:14.587614+00
271	2026-07-01	2026	7	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.07	1.16	2026-01-24 13:09:14.587614+00
272	2026-08-01	2026	8	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.16	1.16	2026-01-24 13:09:14.587614+00
273	2026-09-01	2026	9	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.21	1.16	2026-01-24 13:09:14.587614+00
274	2026-10-01	2026	10	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.16	1.16	2026-01-24 13:09:14.587614+00
275	2026-11-01	2026	11	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.07	1.16	2026-01-24 13:09:14.587614+00
276	2026-12-01	2026	12	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.33	1.16	2026-01-24 13:09:14.587614+00
1669	2027-01-01	2027	1	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.37	0.00	0.87	1.16	2026-01-25 01:08:15.360548+00
1670	2027-02-01	2027	2	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.69	0.17	1.19	1.16	2026-01-25 01:08:15.360548+00
1671	2027-03-01	2027	3	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.41	0.00	0.94	1.16	2026-01-25 01:08:15.360548+00
1672	2027-04-01	2027	4	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.43	0.00	0.93	1.16	2026-01-25 01:08:15.360548+00
1673	2027-05-01	2027	5	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.05	0.00	0.56	1.16	2026-01-25 01:08:15.360548+00
1674	2027-06-01	2027	6	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.22	1.16	2026-01-25 01:08:15.360548+00
1675	2027-07-01	2027	7	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.02	1.16	2026-01-25 01:08:15.360548+00
1676	2027-08-01	2027	8	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.11	1.16	2026-01-25 01:08:15.360548+00
1677	2027-09-01	2027	9	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.16	1.16	2026-01-25 01:08:15.360548+00
1678	2027-10-01	2027	10	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.17	1.16	2026-01-25 01:08:15.360548+00
1679	2027-11-01	2027	11	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.03	1.16	2026-01-25 01:08:15.360548+00
1680	2027-12-01	2027	12	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.22	1.16	2026-01-25 01:08:15.360548+00
1681	2028-01-01	2028	1	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.28	0.00	0.80	1.16	2026-01-25 01:08:15.360548+00
1682	2028-02-01	2028	2	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.69	0.16	1.19	1.16	2026-01-25 01:08:15.360548+00
1683	2028-03-01	2028	3	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.83	0.31	1.33	1.16	2026-01-25 01:08:15.360548+00
1684	2028-04-01	2028	4	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.48	0.00	1.02	1.16	2026-01-25 01:08:15.360548+00
1685	2028-05-01	2028	5	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.30	1.16	2026-01-25 01:08:15.734866+00
1686	2028-06-01	2028	6	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.22	1.16	2026-01-25 01:08:15.734866+00
1687	2028-07-01	2028	7	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.49	1.16	2026-01-25 01:08:15.734866+00
1688	2028-08-01	2028	8	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.59	1.16	2026-01-25 01:08:15.734866+00
1689	2028-09-01	2028	9	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.47	1.16	2026-01-25 01:08:15.734866+00
1690	2028-10-01	2028	10	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	-0.32	1.16	2026-01-25 01:08:15.734866+00
1691	2028-11-01	2028	11	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.02	1.16	2026-01-25 01:08:15.734866+00
1692	2028-12-01	2028	12	Vĩnh Long	Tích Thiện	106.085000	9.980000	0.00	0.00	0.40	1.16	2026-01-25 01:08:15.734866+00
1705	2027-01-01	2027	1	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.50	0.34	0.66	1.10	2026-01-25 01:08:15.734866+00
1706	2027-02-01	2027	2	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.64	0.49	0.80	1.10	2026-01-25 01:08:15.734866+00
1707	2027-03-01	2027	3	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.77	0.61	0.92	1.10	2026-01-25 01:08:15.734866+00
1708	2027-04-01	2027	4	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.67	0.52	0.85	1.10	2026-01-25 01:08:15.734866+00
1709	2027-05-01	2027	5	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.42	0.27	0.59	1.10	2026-01-25 01:08:15.734866+00
1710	2027-06-01	2027	6	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.20	0.03	0.35	1.10	2026-01-25 01:08:15.734866+00
1711	2027-07-01	2027	7	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.06	0.00	0.22	1.10	2026-01-25 01:08:15.734866+00
1712	2027-08-01	2027	8	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.01	0.00	0.18	1.10	2026-01-25 01:08:15.734866+00
1713	2027-09-01	2027	9	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.00	0.00	0.16	1.10	2026-01-25 01:08:15.734866+00
1714	2027-10-01	2027	10	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.05	0.00	0.21	1.10	2026-01-25 01:08:15.734866+00
1715	2027-11-01	2027	11	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.19	0.04	0.36	1.10	2026-01-25 01:08:15.734866+00
1716	2027-12-01	2027	12	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.37	0.21	0.53	1.10	2026-01-25 01:08:15.734866+00
1717	2028-01-01	2028	1	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.53	0.38	0.70	1.10	2026-01-25 01:08:15.734866+00
1718	2028-02-01	2028	2	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.68	0.51	0.85	1.10	2026-01-25 01:08:15.734866+00
1719	2028-03-01	2028	3	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.82	0.66	0.98	1.10	2026-01-25 01:08:15.734866+00
1720	2028-04-01	2028	4	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.72	0.57	0.89	1.10	2026-01-25 01:08:15.734866+00
1721	2028-05-01	2028	5	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.45	0.29	0.62	1.10	2026-01-25 01:08:15.734866+00
1722	2028-06-01	2028	6	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.20	0.04	0.36	1.10	2026-01-25 01:08:15.734866+00
1723	2028-07-01	2028	7	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.07	0.00	0.24	1.10	2026-01-25 01:08:15.734866+00
1724	2028-08-01	2028	8	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.03	0.00	0.20	1.10	2026-01-25 01:08:15.734866+00
1725	2028-09-01	2028	9	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.04	0.00	0.20	1.10	2026-01-25 01:08:15.734866+00
1726	2028-10-01	2028	10	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.09	0.00	0.27	1.10	2026-01-25 01:08:15.734866+00
1727	2028-11-01	2028	11	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.22	0.05	0.39	1.10	2026-01-25 01:08:15.734866+00
1728	2028-12-01	2028	12	Vĩnh Long	Vũng Liêm	106.180000	10.120000	0.41	0.26	0.58	1.10	2026-01-25 01:08:15.734866+00
298	2026-10-01	2026	10	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.05	0.85	2026-01-24 13:09:14.587614+00
299	2026-11-01	2026	11	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	0.08	0.85	2026-01-24 13:09:14.587614+00
300	2026-12-01	2026	12	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.10	0.00	0.25	0.85	2026-01-24 13:09:14.587614+00
1741	2027-01-01	2027	1	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.23	0.09	0.39	0.85	2026-01-25 01:08:15.734866+00
1742	2027-02-01	2027	2	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.35	0.19	0.48	0.85	2026-01-25 01:08:15.734866+00
1743	2027-03-01	2027	3	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.48	0.34	0.62	0.85	2026-01-25 01:08:15.734866+00
1744	2027-04-01	2027	4	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.39	0.24	0.54	0.85	2026-01-25 01:08:15.734866+00
1745	2027-05-01	2027	5	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.14	0.00	0.29	0.85	2026-01-25 01:08:15.734866+00
1746	2027-06-01	2027	6	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	0.08	0.85	2026-01-25 01:08:15.734866+00
1747	2027-07-01	2027	7	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.04	0.85	2026-01-25 01:08:15.734866+00
1748	2027-08-01	2027	8	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.10	0.85	2026-01-25 01:08:15.734866+00
1749	2027-09-01	2027	9	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.11	0.85	2026-01-25 01:08:15.734866+00
1750	2027-10-01	2027	10	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.05	0.85	2026-01-25 01:08:15.734866+00
1751	2027-11-01	2027	11	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	0.07	0.85	2026-01-25 01:08:15.734866+00
1752	2027-12-01	2027	12	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.08	0.00	0.23	0.85	2026-01-25 01:08:15.734866+00
1753	2028-01-01	2028	1	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.18	0.04	0.32	0.85	2026-01-25 01:08:15.734866+00
1754	2028-02-01	2028	2	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.29	0.15	0.45	0.85	2026-01-25 01:08:15.734866+00
1755	2028-03-01	2028	3	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.42	0.28	0.57	0.85	2026-01-25 01:08:15.734866+00
1756	2028-04-01	2028	4	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.33	0.18	0.48	0.85	2026-01-25 01:08:15.734866+00
1757	2028-05-01	2028	5	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.09	0.00	0.23	0.85	2026-01-25 01:08:15.734866+00
1758	2028-06-01	2028	6	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	0.02	0.85	2026-01-25 01:08:15.734866+00
1759	2028-07-01	2028	7	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.10	0.85	2026-01-25 01:08:15.734866+00
1760	2028-08-01	2028	8	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.14	0.85	2026-01-25 01:08:15.734866+00
1761	2028-09-01	2028	9	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.14	0.85	2026-01-25 01:08:15.734866+00
1762	2028-10-01	2028	10	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	-0.10	0.85	2026-01-25 01:08:15.734866+00
1763	2028-11-01	2028	11	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.00	0.00	0.02	0.85	2026-01-25 01:08:15.734866+00
1764	2028-12-01	2028	12	Đồng Tháp	Cao Lãnh	105.649945	10.420412	0.04	0.00	0.18	0.85	2026-01-25 01:08:15.734866+00
301	2026-01-01	2026	1	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.48	0.00	1.16	0.85	2026-01-24 13:09:14.587614+00
302	2026-02-01	2026	2	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.77	0.07	1.45	0.85	2026-01-24 13:09:14.587614+00
303	2026-03-01	2026	3	Đồng Tháp	Hồng Ngự	105.285000	10.840000	1.08	0.39	1.80	0.85	2026-01-24 13:09:14.587614+00
304	2026-04-01	2026	4	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.91	0.23	1.56	0.85	2026-01-24 13:09:14.587614+00
305	2026-05-01	2026	5	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.31	0.00	1.00	0.85	2026-01-24 13:09:14.587614+00
306	2026-06-01	2026	6	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.45	0.85	2026-01-24 13:09:14.587614+00
307	2026-07-01	2026	7	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.14	0.85	2026-01-24 13:09:14.587614+00
308	2026-08-01	2026	8	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.08	0.85	2026-01-24 13:09:14.587614+00
309	2026-09-01	2026	9	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.01	0.85	2026-01-24 13:09:14.587614+00
310	2026-10-01	2026	10	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.09	0.85	2026-01-24 13:09:14.587614+00
311	2026-11-01	2026	11	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.47	0.85	2026-01-24 13:09:14.587614+00
312	2026-12-01	2026	12	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.11	0.00	0.78	0.85	2026-01-24 13:09:14.587614+00
1777	2027-01-01	2027	1	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.62	0.00	1.30	0.85	2026-01-25 01:08:15.734866+00
1778	2027-02-01	2027	2	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.95	0.27	1.63	0.85	2026-01-25 01:08:15.734866+00
1779	2027-03-01	2027	3	Đồng Tháp	Hồng Ngự	105.285000	10.840000	1.00	0.30	1.72	0.85	2026-01-25 01:08:15.734866+00
1780	2027-04-01	2027	4	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.87	0.17	1.54	0.85	2026-01-25 01:08:15.734866+00
1781	2027-05-01	2027	5	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.36	0.00	1.10	0.85	2026-01-25 01:08:15.734866+00
1782	2027-06-01	2027	6	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.56	0.85	2026-01-25 01:08:15.734866+00
1783	2027-07-01	2027	7	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.25	0.85	2026-01-25 01:08:15.734866+00
1784	2027-08-01	2027	8	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.06	0.85	2026-01-25 01:08:15.734866+00
1785	2027-09-01	2027	9	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.10	0.85	2026-01-25 01:08:15.734866+00
1786	2027-10-01	2027	10	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.09	0.85	2026-01-25 01:08:15.734866+00
1787	2027-11-01	2027	11	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.44	0.85	2026-01-25 01:08:15.734866+00
1788	2027-12-01	2027	12	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.06	0.00	0.77	0.85	2026-01-25 01:08:15.734866+00
1789	2028-01-01	2028	1	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.43	0.00	1.12	0.85	2026-01-25 01:08:15.734866+00
1790	2028-02-01	2028	2	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.79	0.13	1.46	0.85	2026-01-25 01:08:15.734866+00
1791	2028-03-01	2028	3	Đồng Tháp	Hồng Ngự	105.285000	10.840000	1.05	0.33	1.75	0.85	2026-01-25 01:08:15.734866+00
1792	2028-04-01	2028	4	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.79	0.08	1.51	0.85	2026-01-25 01:08:15.734866+00
1793	2028-05-01	2028	5	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.03	0.00	0.74	0.85	2026-01-25 01:08:15.734866+00
1794	2028-06-01	2028	6	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.17	0.85	2026-01-25 01:08:15.734866+00
1795	2028-07-01	2028	7	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	-0.16	0.85	2026-01-25 01:08:15.734866+00
1796	2028-08-01	2028	8	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	-0.33	0.85	2026-01-25 01:08:15.734866+00
1797	2028-09-01	2028	9	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	-0.33	0.85	2026-01-25 01:08:15.734866+00
1798	2028-10-01	2028	10	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	-0.12	0.85	2026-01-25 01:08:15.734866+00
1799	2028-11-01	2028	11	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.00	0.00	0.26	0.85	2026-01-25 01:08:15.734866+00
1800	2028-12-01	2028	12	Đồng Tháp	Hồng Ngự	105.285000	10.840000	0.01	0.00	0.69	0.85	2026-01-25 01:08:15.734866+00
\.


--
-- Data for Name: receivables; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receivables (id, transaction_id, invoice_number, business_id, customer_id, original_amount, outstanding_amount, paid_amount, interest_amount, late_fee_amount, due_date, status, is_discounted, discount_rate, discounted_amount, discounted_to, discounted_at, notes, created_at, updated_at, paid_at) FROM stdin;
\.


--
-- Data for Name: user_badges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_badges (id, user_id, badge_id, earned_at) FROM stdin;
44482754-e0e9-4fb8-9b00-5361a7367f51	1993de5f-2df4-4232-bdaf-96681211700f	first_post	2026-01-16 15:45:31.963462+00
522d5fa0-26f9-4753-b3db-7f4978d9b2fe	37f5ce8a-f218-4ec7-87d0-52967b78be4e	first_post	2026-01-16 16:29:47.779892+00
3e646d67-21d6-4ddd-b7c2-0a6526843127	6c836d7e-cf23-4001-bf1f-e9b6ee09de2d	first_post	2026-01-16 16:32:19.882867+00
0c073311-f522-4d69-9065-4d5e73b97186	79e0fa0b-9ca6-433a-925c-689801a402c7	first_post	2026-01-16 16:35:44.247424+00
52893122-2113-4641-8170-0e4d22099b52	0ee6e332-1888-4b58-8c1b-6d67fe44a59b	first_post	2026-01-16 16:45:48.151069+00
7eb68b35-8ab8-4b1e-8bb8-9809b4a91ca7	d7b8b6cd-75cf-4324-b3ce-975a95849477	first_post	2026-01-16 17:15:39.928561+00
350ea598-6708-4c2b-894e-5f41ce4bf2db	532e3227-3b29-42de-b1c2-317510d0b559	first_post	2026-01-17 09:33:02.350366+00
3c6963c5-4075-4287-9da6-039715db9661	dd5e2f80-2fb3-45ac-9e38-b7a054f820cd	first_post	2026-01-17 10:10:21.837802+00
fd9ffd32-8ef1-4cb9-9058-9792c2417737	df685ac0-6065-4547-80f1-71997bc5684e	first_post	2026-01-17 10:37:32.521723+00
e2507c2b-0204-4a5b-80dd-04d8d9a4c72a	9ce9ba21-e14e-45b9-b634-72c14b65f1ec	first_post	2026-01-17 10:42:43.869763+00
ef7ef1fb-7f87-4187-b3ad-09d560cf3abf	76fb9807-6735-478f-a363-79fb2a20be7f	first_post	2026-01-17 10:46:30.323911+00
412ab5c8-7a06-4b36-a11d-f73c158dca0c	1c1df301-da2b-4ed7-aa41-bf216a66d009	first_post	2026-01-20 06:11:35.429043+00
6563d225-350b-4cc1-99a6-e26ef773e231	e977b62e-005f-4c17-9384-1f9a6283ca02	first_post	2026-01-21 06:58:24.248343+00
05840466-6181-4dca-bdfb-4fdc72cf6548	06558882-7a10-4b69-b8e0-4fef2684a434	first_post	2026-01-21 07:26:32.97535+00
b1934d22-92ea-443c-878b-4205c2b65c0f	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	first_post	2026-01-21 08:02:53.92047+00
7d78a256-e162-45a2-8146-0eea96c37f49	6c45203b-a5ff-4f1c-be40-6bce6188f757	helpful_contributor	2026-01-22 03:10:40.722488+00
2723549d-7fc0-4628-af6d-45d0613cfa7b	2374dd2e-e380-45d4-a350-bedbaae40ad0	first_post	2026-02-18 05:07:15.528499+00
ec48eeeb-b51c-4efd-a0f4-ac41cb000457	300bd426-4394-4f3d-9691-38c40b380222	first_post	2026-04-02 11:33:02.97088+00
40a019ea-bb40-4248-835c-93d879f36bd1	2175a36f-c2d5-431a-9482-04d3bd25e53f	first_post	2026-04-02 11:48:59.532971+00
\.


--
-- Data for Name: user_follows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_follows (id, follower_id, following_id, created_at) FROM stdin;
720958aa-5352-469d-bb06-008b64997767	76fb9807-6735-478f-a363-79fb2a20be7f	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-21 03:37:57.391065+00
25cb353b-6f65-47e0-8ea5-b1e98bbea73e	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 07:54:52.599551+00
9b6dc79d-a2d3-4af5-aac5-f869d7c415dd	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-21 07:55:33.391519+00
110b14c7-616f-4405-af12-86761a1587fa	a49342a7-3158-433b-a256-172b68d1de57	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-21 09:23:50.638933+00
f5c7af26-9269-4b4b-b7fb-d9baf2be5870	511c3f9d-9125-4586-b351-45348ad11743	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 00:35:43.152291+00
6764d1c8-58d9-4d11-ae98-f22b46a861c5	511c3f9d-9125-4586-b351-45348ad11743	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:35:54.943952+00
f65c9a4a-8d8e-4926-bce6-c183ef11bb95	50644fc3-8363-44f2-836e-61b3a252478d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:41:47.974882+00
3dce042e-010e-43a2-95fa-d16d17962cbb	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:45:00.308686+00
0485fea4-d05a-4601-8a12-2af2698e3153	eb6c8157-4b5e-4c0a-93b9-02458a4fe5d7	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 00:45:09.708138+00
b5a4fb2e-7033-4ed6-86f0-9c96d2983f03	c35ce40a-b44f-49a7-aa8e-ed95060759b1	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:46:17.892544+00
2be24a6f-60f8-4199-8175-fa350a395c07	6137e67a-d461-46fd-ac2a-17ce6c29b22f	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:47:48.871443+00
812279c1-b1c8-4cf3-b3c1-0de3d9ad3fc5	6137e67a-d461-46fd-ac2a-17ce6c29b22f	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 00:47:59.161462+00
bded4896-12a7-4bd2-91db-de5a54006779	791939bf-486b-4d03-98df-7eefd4aa15f2	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 00:49:33.041897+00
eedcfd83-869f-4514-89ac-096fd1e2c2f2	24af4b7b-9a2f-4450-9a85-fecaf0c50eaf	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 00:51:13.907628+00
ec9b5e39-069f-4302-b645-409340067169	8d390cb3-59e1-45c3-93a0-1459b74498a4	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 00:54:27.60045+00
70a31873-182d-4abf-8048-d2e1070cdc0a	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 01:06:08.785485+00
a042fe4b-542a-46ca-a9c5-5454da29ccfb	c9bbb9f4-4b8f-4de6-94cd-ec7b4e20586e	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:08:26.231409+00
c9bd12b1-c7dd-4d56-a81e-3b37342c5d09	d40eddeb-94f1-4a8e-b05e-f8a02843b691	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:12:33.660824+00
cf5ea5e0-f0db-46e4-995a-72ea2535fda1	0a0c0f64-1a4d-4973-ba98-942a0a381c8a	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:15:53.850551+00
5328ca7d-78d9-4ffa-9d63-39939273aca5	1919a069-3c62-4408-9f6b-aba65bbdcce7	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:16:57.170237+00
63ee1bfb-6ff9-4192-8469-2acf0664d28c	31b8206a-ea5d-41cf-968e-6f19b87aba62	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:19:01.968075+00
c79a9e36-0708-453e-8685-75f53641139a	dff3c363-ffbe-42ec-8639-3d1165ec6ccf	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 01:20:12.806921+00
0f6322b3-5f8e-42c0-98f2-a04fabd9835e	761258bd-d832-4b3e-8f14-bb8e3f934d26	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 01:21:26.310841+00
d6a9f2a1-541b-4ae7-876d-6e7a305b90df	761258bd-d832-4b3e-8f14-bb8e3f934d26	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:21:39.379066+00
7bff0408-4304-4695-a038-eeb03c0bf760	837fcc4c-8f9b-4870-8dfa-e1a7e5739bee	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:24:44.966814+00
4e5ff29c-877d-423c-a469-ca6c2c2fb86a	54f5d7bb-aa49-4490-8ad0-7a95b5defa23	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:26:20.518856+00
cc0ed0ce-38b4-470e-b134-b6d16ea7f303	65b54fdc-6983-4242-8b99-823e47f3a0a7	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:28:54.567287+00
3bea6474-d522-4b67-9186-27864e920b75	cfd6e3a8-82ce-4a45-b613-0e78fa463439	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:30:38.954063+00
9a7651a7-233c-4cf1-a908-41bc85e16232	5981f73f-c8eb-46ca-97cf-61bb2373bc52	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:38:52.524948+00
396caa54-1bb1-4219-a77b-0359e90ec63f	5981f73f-c8eb-46ca-97cf-61bb2373bc52	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 01:39:03.135993+00
a47b13bc-4ea1-436a-9b44-d42cbfef15b4	4733c4f2-b333-4f33-8526-490f50a57499	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:40:41.813485+00
d5098202-5f12-47cd-8f72-9ffcace6d21e	4f95bb6c-f9fd-4aa4-987d-d38b18473aea	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:41:51.243459+00
61cc5bb6-26cf-49c3-b272-a6aa8428e507	d28140c0-4739-4adb-b40c-dad97b2551bd	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:45:04.177952+00
119c6a48-384c-43d2-9f52-a40f20307187	29573c2b-fdf5-4831-974c-9851cb4d9fc3	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:47:10.204814+00
b732c7c5-08e8-4f05-b09c-8a4836431163	1e2967ab-e057-4927-8fe4-b2f769a5a6df	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 01:48:49.312155+00
e339019b-c587-4fe0-bf5d-354e0e6b10b2	1e2967ab-e057-4927-8fe4-b2f769a5a6df	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:48:59.121324+00
c822da42-56ad-4b14-9d87-1d8ba332533f	8bfbf7dd-4232-4d1d-8941-0f4e5d5c4a2f	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:50:25.251183+00
465ddf44-bfb6-4a61-9a85-22e6df4f9489	5d100834-5494-4217-ac7c-e02053c4f016	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 01:54:57.376505+00
1804b5a5-029c-4b92-87f1-093dc55dbe2d	d2e6bd70-2b23-497c-b1a3-6b87d84a47d1	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 01:56:04.159381+00
a6c41eab-d048-4478-a9be-ba8f39751922	2f835397-40fb-430f-96bb-3b23e988950e	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:01:45.585801+00
ba392db7-a39e-4201-97ee-4555b4de6049	5c53db2c-057e-4bf6-9782-31a25c74e269	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:03:35.003091+00
ee043693-61a9-423a-919b-4b1071d0bd3d	e83d9b5f-8ba3-4c2a-a6ed-4242c290fcda	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:06:42.518194+00
625428e1-bc25-451c-8a92-5170e79f3629	b6d92a45-c510-4686-9f25-824bc32e96cb	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:08:21.553826+00
ce5edaf0-98d1-4bc3-8ebf-edc4bf4be61e	e7192c5a-5314-4d99-a0e9-cf235dcad2cc	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:09:55.225151+00
bd5d738a-0ccd-4c64-b3f3-e908f92c7d34	62ba9225-b9c3-4760-9c1a-bab4f9a318e8	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:11:35.481742+00
1291d0a7-2919-4077-bfa1-4c6e6846f1bb	143a5beb-1342-40f7-b9ef-3431b4c44da4	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 02:13:06.839461+00
5259b52b-2636-45fb-b67d-96b1711a765f	3f43944a-64de-489a-aac4-7564b6367304	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:14:27.28813+00
9d571f0b-a9c8-4fa8-8dde-2246d4677d37	5e6a591b-bf61-46aa-9502-9f9baaa0cc93	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:15:30.420983+00
f3bf1349-35d7-42f8-98ef-330a7271adef	9a92b411-973c-485e-9572-541a3989be22	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-22 02:16:31.863199+00
e7f854a6-43f2-4bcd-a6ba-717c77ef7e93	9a92b411-973c-485e-9572-541a3989be22	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:16:43.497131+00
d69965d3-a1d7-4686-ba19-71af741cb083	4dfa04a3-0a7b-4b38-8a79-51447ac5d64c	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:17:50.524997+00
f250d223-bf8a-48b5-b389-5358ccaa4c87	27cdf08b-ca0b-45a6-99c7-34e2927dea2d	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:19:08.768859+00
5d4c263e-9cd1-478f-b7cb-ea9bd659ee3f	b2b6f7eb-2bff-4dfb-8f98-e17f08de0847	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:24:02.308626+00
f42d3569-8c8e-473d-9ad2-55abb9554c4d	f404aa02-8c39-4c40-850e-f7f13b9a2adb	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 02:25:32.423049+00
5d3eb2ca-c082-4d72-948c-da17f617ddf7	f404aa02-8c39-4c40-850e-f7f13b9a2adb	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-22 02:25:48.721636+00
74064835-e077-41c0-985b-45dfc2cac206	eb7de62b-d4c8-4e76-a75e-b32af563a4c0	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:09:16.995986+00
8bb6187a-3cdc-4201-8152-19f40930cd28	4104824d-4aaa-4ce4-b304-d1074d61fba6	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:12:20.462951+00
216e5cfc-84e3-40d4-84c9-d5db67ba0104	dbda9c37-7eac-4e1e-9c74-bd66e80bb924	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:13:50.679733+00
02bf2e47-e8aa-4012-9fe0-2e9f0910d45f	6fb4e6fd-e573-4551-8480-91aaa0d63b80	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:15:56.225036+00
3d179419-f61d-4878-8b6c-4ea1b2768a37	6d277ecb-1abf-4361-b0c3-0948f3b8d234	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:17:12.041799+00
a311687f-baef-4892-b1ec-3e19cb33aaa3	7646b385-d2e4-4b95-acc5-c816e3cd1412	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:18:53.099407+00
9cfe83e1-8db4-4de1-bd6e-2c5e8fc91f6a	57dc34b6-bdcb-45e9-b0f4-f1aaad363aa1	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:20:18.929188+00
edb257b2-9ed5-4509-a1f8-47c50767cf75	35dca33b-9d87-448c-80f5-a93eb0940c7f	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:23:11.351245+00
ff4d0c67-3070-48ee-9a83-11b1e32b8bc4	9ec8512b-24ba-4581-a362-6f7a3a6c0235	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:24:19.126084+00
63049fa9-f8ca-4c26-87a8-ba4f93f82fd7	e15551b8-af10-46c7-b62e-b6736ca520cb	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:29:45.260655+00
19d4f434-5982-4f82-9d8a-9470f6fd9b2f	8ab57ed4-2107-4880-88a5-93e07bc747d0	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-01-22 03:33:11.390465+00
f2c6cb88-5e03-4a11-b701-377a145600e1	2a6e0bac-c268-4cb2-b1be-f240c4fc0a9a	bc6c3fc7-6be0-47b9-90ab-a7eb3cf5f209	2026-01-23 01:23:21.321117+00
81afd109-26cb-4e73-8e1d-d58115fc3a19	9d0ef483-3495-446e-a744-f290c1e4d509	4e9dd36c-38f2-4353-a320-0c31fa3cc970	2026-03-25 10:45:30.877105+00
\.


--
-- Data for Name: user_post_activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_post_activity (id, user_id, post_date, created_at) FROM stdin;
e65b9c1b-3b61-498e-81b2-4ddf4a9be4e8	1993de5f-2df4-4232-bdaf-96681211700f	2026-01-16	2026-01-16 15:45:31.963462+00
b0f02fb8-2ce7-47ed-9bb0-406daf496cf6	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-16	2026-01-16 16:22:51.409694+00
61b909b9-6600-4459-8ddd-22ec469980aa	6c836d7e-cf23-4001-bf1f-e9b6ee09de2d	2026-01-16	2026-01-16 16:32:19.882867+00
7353be60-d2ae-4fc3-b025-b634a3cf0ae6	79e0fa0b-9ca6-433a-925c-689801a402c7	2026-01-16	2026-01-16 16:35:44.247424+00
1cc2d674-5e2b-4945-948d-0155f7106449	0ee6e332-1888-4b58-8c1b-6d67fe44a59b	2026-01-16	2026-01-16 16:45:48.151069+00
a6cb2a46-2b75-4c41-84f8-aa1fae079202	d7b8b6cd-75cf-4324-b3ce-975a95849477	2026-01-16	2026-01-16 17:15:39.928561+00
4e5710d6-efa8-4654-bb0b-c479bd372a70	532e3227-3b29-42de-b1c2-317510d0b559	2026-01-17	2026-01-17 09:33:02.350366+00
5529698e-91c8-4b5a-afa6-d9f2632574f4	dd5e2f80-2fb3-45ac-9e38-b7a054f820cd	2026-01-17	2026-01-17 10:10:21.837802+00
e70aaff3-9b8f-4583-9d2d-f0112a6cf0e2	becff985-c6d5-4413-8bc9-4ef86fa5ac52	2026-01-17	2026-01-17 10:28:35.498462+00
b9c5631e-2471-43da-b896-881e13be21ab	df685ac0-6065-4547-80f1-71997bc5684e	2026-01-17	2026-01-17 10:37:32.521723+00
36227503-bcb4-4782-a7a3-36debc86c3b8	9ce9ba21-e14e-45b9-b634-72c14b65f1ec	2026-01-17	2026-01-17 10:42:43.869763+00
cd8c68cd-c15c-48f7-b5c5-106a049b862c	76fb9807-6735-478f-a363-79fb2a20be7f	2026-01-17	2026-01-17 10:46:30.323911+00
e07eb730-4792-489c-a2e8-3aa248581a6a	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-17	2026-01-17 11:09:00.567687+00
01707263-5f1c-495f-ad63-9f7541c95afb	1c1df301-da2b-4ed7-aa41-bf216a66d009	2026-01-20	2026-01-20 06:11:35.429043+00
84525e93-381b-4cad-8441-553a242de82d	76fb9807-6735-478f-a363-79fb2a20be7f	2026-01-21	2026-01-21 04:47:42.344423+00
f79e0796-84df-49d4-b8d3-07f8e7a1923d	e977b62e-005f-4c17-9384-1f9a6283ca02	2026-01-21	2026-01-21 06:58:24.248343+00
c5c43c46-faf0-432c-bf73-ca6a2e335fbe	06558882-7a10-4b69-b8e0-4fef2684a434	2026-01-21	2026-01-21 07:26:32.97535+00
2cf71be0-c0ef-4ef9-8f99-3b54f11f4ce1	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	2026-01-21	2026-01-21 08:02:53.92047+00
78298586-0916-4e09-9824-499dcb42f15b	37f5ce8a-f218-4ec7-87d0-52967b78be4e	2026-01-23	2026-01-23 09:01:54.856668+00
38b759ba-cc55-4be8-8bd7-87f33a5dde02	2374dd2e-e380-45d4-a350-bedbaae40ad0	2026-02-18	2026-02-18 05:07:15.528499+00
82e21264-edb7-4b20-8176-ac51c75c1e47	300bd426-4394-4f3d-9691-38c40b380222	2026-04-02	2026-04-02 11:33:02.97088+00
71dfc125-7e61-4438-8e79-8657eabcf272	6c45203b-a5ff-4f1c-be40-6bce6188f757	2026-04-02	2026-04-02 11:45:40.641477+00
6b5eaa19-410f-47a8-8989-cd66f02ba637	2175a36f-c2d5-431a-9482-04d3bd25e53f	2026-04-02	2026-04-02 11:48:59.532971+00
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_settings (id, user_id, language, theme, email_notifications, email_new_follower, email_post_like, email_post_comment, email_project_update, push_notifications, push_new_follower, push_post_like, push_post_comment, push_project_update, profile_visibility, show_email, show_phone, allow_messages, show_activity, created_at, updated_at) FROM stdin;
db075591-00fc-416a-8e0d-cf2cc5c20664	37f5ce8a-f218-4ec7-87d0-52967b78be4e	vi	dark	t	t	t	t	t	t	t	f	t	t	public	f	t	t	t	2026-01-21 04:15:18.161168+00	2026-01-21 04:27:55.93694+00
4f252139-1006-42de-ab7c-bf01e301c60a	e65ce75b-fdd6-4b2b-b6c8-c189c5030404	vi	dark	t	t	t	t	t	t	t	f	t	t	public	f	t	t	t	2026-01-21 07:42:46.23106+00	2026-01-21 07:43:56.508886+00
78936744-d1fc-41e2-aaa5-64061c475d41	c3aa89c3-71b6-4c7e-9afe-e3ea7817a213	vi	light	t	t	t	t	t	t	t	f	t	t	public	f	t	t	t	2026-01-21 08:12:58.079213+00	2026-01-21 08:12:58.079213+00
0479fe50-a741-4111-81ac-de1378b6e868	9d0ef483-3495-446e-a744-f290c1e4d509	vi	light	t	t	t	t	t	t	t	f	t	t	public	f	t	t	t	2026-03-25 10:51:01.55372+00	2026-03-25 10:51:01.55372+00
ad3323e5-1edd-4132-a955-66ed532f6723	4e9dd36c-38f2-4353-a320-0c31fa3cc970	vi	light	t	t	t	t	t	t	t	f	t	t	public	f	t	t	t	2026-03-25 10:55:34.305194+00	2026-03-25 10:55:34.305194+00
60973b29-ca28-4be9-8356-7a660859c55a	16da4e53-c6ee-427a-9944-3794eaa52a05	vi	light	t	t	t	t	t	t	t	f	t	t	public	f	t	t	t	2026-03-30 10:09:36.855517+00	2026-03-30 10:09:36.855517+00
f29aa4c0-90c4-4f63-8014-7c0c4e0be5d5	8e5489ab-5339-4864-aa29-845a32684bdf	vi	light	t	t	t	t	t	t	t	f	t	t	public	f	t	t	t	2026-09-06 13:17:00.529935+00	2026-09-06 13:17:00.529935+00
\.


--
-- Data for Name: verification_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verification_documents (id, user_id, transaction_id, document_type, document_url, reference_link, status, verified_by, verified_at, rejection_reason, notes, created_at, updated_at) FROM stdin;
56187aac-d6f8-4feb-82ea-3f0d35624cfd	37f5ce8a-f218-4ec7-87d0-52967b78be4e	\N	farming_certificate	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/verification-documents/37f5ce8a-f218-4ec7-87d0-52967b78be4e/1769281786616.jpg	https://luatvietnam.vn/bieu-mau/mau-giay-xac-nhan-truc-tiep-san-xuat-nong-nghiep-571-91809-article.html	approved	\N	2026-01-24 19:10:47.169+00	\N	\N	2026-01-24 19:09:46.835937+00	2026-01-25 02:22:22.955917+00
c05a18ea-ac2f-4d7b-8bcb-e9b8f633f748	8e5489ab-5339-4864-aa29-845a32684bdf	502d8fd3-74d4-4859-b22b-c0cef86eddc6	farming_certificate	https://bcaxzztonydnpwbnsmgd.supabase.co/storage/v1/object/public/verification-documents/8e5489ab-5339-4864-aa29-845a32684bdf/1788699198144.png	https://luatvietnam.vn/bieu-mau/mau-giay-xac-nhan-truc-tiep-san-xuat-nong-nghiep-571-91809-article.html	pending	\N	\N	\N	\N	2026-09-06 12:53:19.505588+00	2026-09-06 12:53:19.505588+00
\.


--
-- Name: prophet_predict_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prophet_predict_id_seq', 1800, true);


--
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- Name: badge_definitions badge_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badge_definitions
    ADD CONSTRAINT badge_definitions_pkey PRIMARY KEY (id);


--
-- Name: business_customer_links business_customer_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_customer_links
    ADD CONSTRAINT business_customer_links_pkey PRIMARY KEY (id);


--
-- Name: comment_likes comment_likes_comment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_user_id_key UNIQUE (comment_id, user_id);


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);


--
-- Name: contact_requests contact_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_requests
    ADD CONSTRAINT contact_requests_pkey PRIMARY KEY (id);


--
-- Name: content_reports content_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_pkey PRIMARY KEY (id);


--
-- Name: credit_limits credit_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_limits
    ADD CONSTRAINT credit_limits_pkey PRIMARY KEY (id);


--
-- Name: credit_limits credit_limits_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_limits
    ADD CONSTRAINT credit_limits_unique UNIQUE (business_id, customer_id);


--
-- Name: financial_partners financial_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_partners
    ADD CONSTRAINT financial_partners_pkey PRIMARY KEY (id);


--
-- Name: investment_projects investment_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_projects
    ADD CONSTRAINT investment_projects_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- Name: payment_installments payment_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_installments
    ADD CONSTRAINT payment_installments_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_transaction_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_transaction_code_key UNIQUE (transaction_code);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_images post_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: post_shares post_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT post_shares_pkey PRIMARY KEY (id);


--
-- Name: post_shares post_shares_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT post_shares_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: post_videos post_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_videos
    ADD CONSTRAINT post_videos_pkey PRIMARY KEY (id);


--
-- Name: post_views post_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_pkey PRIMARY KEY (id);


--
-- Name: post_views post_views_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: pricing_rules pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_videos product_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_videos
    ADD CONSTRAINT product_videos_pkey PRIMARY KEY (id);


--
-- Name: product_views product_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_pkey PRIMARY KEY (id);


--
-- Name: product_views product_views_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: project_follows project_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_follows
    ADD CONSTRAINT project_follows_pkey PRIMARY KEY (id);


--
-- Name: project_follows project_follows_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_follows
    ADD CONSTRAINT project_follows_unique UNIQUE (user_id, project_id);


--
-- Name: project_investments project_investments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_investments
    ADD CONSTRAINT project_investments_pkey PRIMARY KEY (id);


--
-- Name: project_ratings project_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings
    ADD CONSTRAINT project_ratings_pkey PRIMARY KEY (id);


--
-- Name: project_ratings project_ratings_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings
    ADD CONSTRAINT project_ratings_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: prophet_predict prophet_predict_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prophet_predict
    ADD CONSTRAINT prophet_predict_pkey PRIMARY KEY (id);


--
-- Name: receivables receivables_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_invoice_number_key UNIQUE (invoice_number);


--
-- Name: receivables receivables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_pkey PRIMARY KEY (id);


--
-- Name: business_customer_links unique_business_customer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_customer_links
    ADD CONSTRAINT unique_business_customer UNIQUE (business_id, customer_id);


--
-- Name: prophet_predict unique_monthly_forecast; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prophet_predict
    ADD CONSTRAINT unique_monthly_forecast UNIQUE (ten_tram, nam, thang);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_user_id_badge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);


--
-- Name: user_follows user_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_pkey PRIMARY KEY (id);


--
-- Name: user_follows user_follows_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id);


--
-- Name: user_post_activity user_post_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_post_activity
    ADD CONSTRAINT user_post_activity_pkey PRIMARY KEY (id);


--
-- Name: user_post_activity user_post_activity_user_id_post_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_post_activity
    ADD CONSTRAINT user_post_activity_user_id_post_date_key UNIQUE (user_id, post_date);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- Name: verification_documents verification_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_documents
    ADD CONSTRAINT verification_documents_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_actions_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_actions_admin ON public.admin_actions USING btree (admin_id);


--
-- Name: idx_admin_actions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_actions_created ON public.admin_actions USING btree (created_at DESC);


--
-- Name: idx_admin_actions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_actions_type ON public.admin_actions USING btree (action_type);


--
-- Name: idx_business_customer_links_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_customer_links_business ON public.business_customer_links USING btree (business_id);


--
-- Name: idx_business_customer_links_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_customer_links_customer ON public.business_customer_links USING btree (customer_id);


--
-- Name: idx_business_customer_links_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_customer_links_status ON public.business_customer_links USING btree (status) WHERE (status = 'active'::text);


--
-- Name: idx_comment_likes_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes USING btree (comment_id);


--
-- Name: idx_comment_likes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_likes_created_at ON public.comment_likes USING btree (created_at DESC);


--
-- Name: idx_comment_likes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_likes_user_id ON public.comment_likes USING btree (user_id);


--
-- Name: idx_contact_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_requests_created_at ON public.contact_requests USING btree (created_at DESC);


--
-- Name: idx_contact_requests_partnership_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_requests_partnership_type ON public.contact_requests USING btree (partnership_type);


--
-- Name: idx_contact_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_requests_status ON public.contact_requests USING btree (status);


--
-- Name: idx_content_reports_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_reports_reporter ON public.content_reports USING btree (reporter_id);


--
-- Name: idx_content_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_reports_status ON public.content_reports USING btree (status);


--
-- Name: idx_content_reports_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_reports_type ON public.content_reports USING btree (content_type, content_id);


--
-- Name: idx_credit_limits_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_limits_active ON public.credit_limits USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_credit_limits_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_limits_business ON public.credit_limits USING btree (business_id);


--
-- Name: idx_credit_limits_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_limits_customer ON public.credit_limits USING btree (customer_id);


--
-- Name: idx_financial_partners_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_partners_active ON public.financial_partners USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_investment_projects_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investment_projects_created_at ON public.investment_projects USING btree (created_at DESC);


--
-- Name: idx_investment_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investment_projects_status ON public.investment_projects USING btree (status);


--
-- Name: idx_investment_projects_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investment_projects_user_id ON public.investment_projects USING btree (user_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_organizations_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_name ON public.organizations USING btree (name);


--
-- Name: idx_payment_installments_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_installments_due_date ON public.payment_installments USING btree (due_date);


--
-- Name: idx_payment_installments_receivable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_installments_receivable ON public.payment_installments USING btree (receivable_id);


--
-- Name: idx_payment_installments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_installments_status ON public.payment_installments USING btree (status);


--
-- Name: idx_payment_installments_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_installments_transaction ON public.payment_installments USING btree (transaction_id);


--
-- Name: idx_payment_transactions_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_buyer ON public.payment_transactions USING btree (buyer_id);


--
-- Name: idx_payment_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_created_at ON public.payment_transactions USING btree (created_at DESC);


--
-- Name: idx_payment_transactions_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_due_date ON public.payment_transactions USING btree (due_date);


--
-- Name: idx_payment_transactions_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_seller ON public.payment_transactions USING btree (seller_id);


--
-- Name: idx_payment_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);


--
-- Name: idx_payment_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_type ON public.payment_transactions USING btree (type);


--
-- Name: idx_payment_transactions_verification_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_verification_document_id ON public.payment_transactions USING btree (verification_document_id);


--
-- Name: idx_post_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_comments_created_at ON public.post_comments USING btree (created_at DESC);


--
-- Name: idx_post_comments_parent_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_comments_parent_comment_id ON public.post_comments USING btree (parent_comment_id);


--
-- Name: idx_post_comments_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_comments_post_id ON public.post_comments USING btree (post_id);


--
-- Name: idx_post_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_comments_user_id ON public.post_comments USING btree (user_id);


--
-- Name: idx_post_images_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_images_order ON public.post_images USING btree (post_id, display_order);


--
-- Name: idx_post_images_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_images_post_id ON public.post_images USING btree (post_id);


--
-- Name: idx_post_likes_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_likes_post_id ON public.post_likes USING btree (post_id);


--
-- Name: idx_post_likes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_likes_user_id ON public.post_likes USING btree (user_id);


--
-- Name: idx_post_shares_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_shares_created_at ON public.post_shares USING btree (created_at DESC);


--
-- Name: idx_post_shares_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_shares_post_id ON public.post_shares USING btree (post_id);


--
-- Name: idx_post_shares_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_shares_user_id ON public.post_shares USING btree (user_id);


--
-- Name: idx_post_videos_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_videos_post_id ON public.post_videos USING btree (post_id);


--
-- Name: idx_post_views_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_views_post_id ON public.post_views USING btree (post_id);


--
-- Name: idx_posts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_category ON public.posts USING btree (category);


--
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at DESC);


--
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);


--
-- Name: idx_pricing_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_active ON public.pricing_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_pricing_rules_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_business ON public.pricing_rules USING btree (business_id);


--
-- Name: idx_pricing_rules_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_customer ON public.pricing_rules USING btree (customer_id);


--
-- Name: idx_pricing_rules_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_product ON public.pricing_rules USING btree (product_id);


--
-- Name: idx_product_images_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_order ON public.product_images USING btree (product_id, display_order);


--
-- Name: idx_product_images_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);


--
-- Name: idx_product_videos_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_videos_product_id ON public.product_videos USING btree (product_id);


--
-- Name: idx_product_views_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_product_id ON public.product_views USING btree (product_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_created_at ON public.products USING btree (created_at DESC);


--
-- Name: idx_products_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_user_id ON public.products USING btree (user_id);


--
-- Name: idx_profiles_avatar_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_avatar_url ON public.profiles USING btree (avatar_url) WHERE (avatar_url IS NOT NULL);


--
-- Name: idx_profiles_is_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_is_admin ON public.profiles USING btree (is_admin);


--
-- Name: idx_profiles_is_banned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_is_banned ON public.profiles USING btree (is_banned);


--
-- Name: idx_profiles_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_organization ON public.profiles USING btree (organization_id);


--
-- Name: idx_profiles_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);


--
-- Name: idx_project_follows_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_follows_created_at ON public.project_follows USING btree (created_at DESC);


--
-- Name: idx_project_follows_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_follows_project ON public.project_follows USING btree (project_id);


--
-- Name: idx_project_follows_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_follows_user ON public.project_follows USING btree (user_id);


--
-- Name: idx_project_investments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_investments_created_at ON public.project_investments USING btree (created_at DESC);


--
-- Name: idx_project_investments_investor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_investments_investor_id ON public.project_investments USING btree (investor_id);


--
-- Name: idx_project_investments_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_investments_project_id ON public.project_investments USING btree (project_id);


--
-- Name: idx_project_ratings_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_ratings_project ON public.project_ratings USING btree (project_id);


--
-- Name: idx_project_ratings_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_ratings_rating ON public.project_ratings USING btree (rating);


--
-- Name: idx_project_ratings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_ratings_user ON public.project_ratings USING btree (user_id);


--
-- Name: idx_prophet_nam_thang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prophet_nam_thang ON public.prophet_predict USING btree (nam, thang);


--
-- Name: idx_prophet_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prophet_ngay ON public.prophet_predict USING btree (ngay);


--
-- Name: idx_prophet_tinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prophet_tinh ON public.prophet_predict USING btree (tinh);


--
-- Name: idx_prophet_tram; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prophet_tram ON public.prophet_predict USING btree (ten_tram);


--
-- Name: idx_receivables_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receivables_business ON public.receivables USING btree (business_id);


--
-- Name: idx_receivables_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receivables_customer ON public.receivables USING btree (customer_id);


--
-- Name: idx_receivables_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receivables_due_date ON public.receivables USING btree (due_date);


--
-- Name: idx_receivables_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receivables_status ON public.receivables USING btree (status);


--
-- Name: idx_receivables_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receivables_transaction ON public.receivables USING btree (transaction_id);


--
-- Name: idx_reset_codes_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reset_codes_phone ON public.password_reset_codes USING btree (phone_number, expires_at);


--
-- Name: idx_reset_codes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reset_codes_user ON public.password_reset_codes USING btree (user_id);


--
-- Name: idx_user_badges_badge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_badge ON public.user_badges USING btree (badge_id);


--
-- Name: idx_user_badges_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_user ON public.user_badges USING btree (user_id);


--
-- Name: idx_user_follows_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_follows_created_at ON public.user_follows USING btree (created_at DESC);


--
-- Name: idx_user_follows_follower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_follows_follower ON public.user_follows USING btree (follower_id);


--
-- Name: idx_user_follows_following; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_follows_following ON public.user_follows USING btree (following_id);


--
-- Name: idx_user_post_activity_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_post_activity_date ON public.user_post_activity USING btree (post_date);


--
-- Name: idx_user_post_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_post_activity_user ON public.user_post_activity USING btree (user_id);


--
-- Name: idx_user_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_settings_user_id ON public.user_settings USING btree (user_id);


--
-- Name: idx_verification_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_documents_status ON public.verification_documents USING btree (status);


--
-- Name: idx_verification_documents_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_documents_transaction_id ON public.verification_documents USING btree (transaction_id);


--
-- Name: idx_verification_documents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_documents_user_id ON public.verification_documents USING btree (user_id);


--
-- Name: idx_verification_documents_verified_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_documents_verified_by ON public.verification_documents USING btree (verified_by);


--
-- Name: posts award_first_post_badge; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER award_first_post_badge AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.check_first_post_badge();


--
-- Name: user_post_activity check_consecutive_days_badge; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_consecutive_days_badge AFTER INSERT ON public.user_post_activity FOR EACH ROW EXECUTE FUNCTION public.check_active_member_badge();


--
-- Name: project_investments check_investment_badge; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_investment_badge AFTER INSERT ON public.project_investments FOR EACH ROW EXECUTE FUNCTION public.check_investor_badge();


--
-- Name: profiles check_leaderboard_badge; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_leaderboard_badge AFTER UPDATE ON public.profiles FOR EACH ROW WHEN ((old.points IS DISTINCT FROM new.points)) EXECUTE FUNCTION public.check_expert_badge();


--
-- Name: post_likes check_likes_badge; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_likes_badge AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.check_helpful_contributor_badge();


--
-- Name: payment_transactions create_receivable_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_receivable_trigger AFTER INSERT OR UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.create_receivable_for_credit();


--
-- Name: organizations set_updated_at_organizations; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles set_updated_at_profiles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: post_comments trigger_notify_comment_reply; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_comment_reply AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment_reply();


--
-- Name: user_follows trigger_notify_new_follower; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_new_follower AFTER INSERT ON public.user_follows FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();


--
-- Name: post_comments trigger_notify_post_comment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_post_comment AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();


--
-- Name: post_likes trigger_notify_post_like; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_post_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();


--
-- Name: post_shares trigger_notify_post_share; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_post_share AFTER INSERT ON public.post_shares FOR EACH ROW EXECUTE FUNCTION public.notify_post_share();


--
-- Name: investment_projects trigger_notify_project_followers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_project_followers AFTER UPDATE ON public.investment_projects FOR EACH ROW EXECUTE FUNCTION public.notify_project_followers_on_update();


--
-- Name: project_investments trigger_notify_project_investment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_project_investment AFTER INSERT ON public.project_investments FOR EACH ROW EXECUTE FUNCTION public.notify_project_investment();


--
-- Name: project_ratings trigger_notify_project_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_project_rating AFTER INSERT ON public.project_ratings FOR EACH ROW EXECUTE FUNCTION public.notify_project_rating();


--
-- Name: user_settings trigger_update_user_settings_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_settings_timestamp BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_user_settings_timestamp();


--
-- Name: business_customer_links update_business_customer_links_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_customer_links_timestamp BEFORE UPDATE ON public.business_customer_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: comment_likes update_comment_like_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_comment_like_count_trigger AFTER INSERT OR DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.update_comment_like_count();


--
-- Name: post_comments update_comment_reply_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_comment_reply_count_trigger AFTER INSERT OR DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.update_comment_reply_count();


--
-- Name: post_comments update_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contact_requests update_contact_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contact_requests_updated_at BEFORE UPDATE ON public.contact_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: credit_limits update_credit_limits_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_credit_limits_timestamp BEFORE UPDATE ON public.credit_limits FOR EACH ROW EXECUTE FUNCTION public.update_payment_timestamp();


--
-- Name: payment_transactions update_credit_usage_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_credit_usage_trigger AFTER INSERT OR UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.update_credit_usage();


--
-- Name: project_investments update_funding_on_investment_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_funding_on_investment_change AFTER INSERT OR UPDATE ON public.project_investments FOR EACH ROW EXECUTE FUNCTION public.update_project_funding();


--
-- Name: investment_projects update_investment_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_investment_projects_updated_at BEFORE UPDATE ON public.investment_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_transactions update_payment_transactions_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_transactions_timestamp BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.update_payment_timestamp();


--
-- Name: posts update_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_rules update_pricing_rules_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pricing_rules_timestamp BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_payment_timestamp();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_investments update_project_investments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_investments_updated_at BEFORE UPDATE ON public.project_investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_ratings update_project_ratings_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_ratings_updated_at_trigger BEFORE UPDATE ON public.project_ratings FOR EACH ROW EXECUTE FUNCTION public.update_project_ratings_updated_at();


--
-- Name: receivables update_receivables_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_receivables_timestamp BEFORE UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.update_payment_timestamp();


--
-- Name: verification_documents verification_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER verification_documents_updated_at BEFORE UPDATE ON public.verification_documents FOR EACH ROW EXECUTE FUNCTION public.update_verification_documents_updated_at();


--
-- Name: admin_actions admin_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: business_customer_links business_customer_links_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_customer_links
    ADD CONSTRAINT business_customer_links_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: business_customer_links business_customer_links_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_customer_links
    ADD CONSTRAINT business_customer_links_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: business_customer_links business_customer_links_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_customer_links
    ADD CONSTRAINT business_customer_links_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: business_customer_links business_customer_links_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_customer_links
    ADD CONSTRAINT business_customer_links_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id);


--
-- Name: comment_likes comment_likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.post_comments(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: content_reports content_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: content_reports content_reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id);


--
-- Name: credit_limits credit_limits_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_limits
    ADD CONSTRAINT credit_limits_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: credit_limits credit_limits_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_limits
    ADD CONSTRAINT credit_limits_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: credit_limits credit_limits_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_limits
    ADD CONSTRAINT credit_limits_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: investment_projects investment_projects_moderated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_projects
    ADD CONSTRAINT investment_projects_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.profiles(id);


--
-- Name: investment_projects investment_projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_projects
    ADD CONSTRAINT investment_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_codes password_reset_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_installments payment_installments_receivable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_installments
    ADD CONSTRAINT payment_installments_receivable_id_fkey FOREIGN KEY (receivable_id) REFERENCES public.receivables(id) ON DELETE CASCADE;


--
-- Name: payment_installments payment_installments_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_installments
    ADD CONSTRAINT payment_installments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.payment_transactions(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_verification_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_verification_document_id_fkey FOREIGN KEY (verification_document_id) REFERENCES public.verification_documents(id);


--
-- Name: post_comments post_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.post_comments(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: post_images post_images_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: post_shares post_shares_original_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT post_shares_original_user_id_fkey FOREIGN KEY (original_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: post_shares post_shares_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT post_shares_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_shares post_shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT post_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: post_videos post_videos_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_videos
    ADD CONSTRAINT post_videos_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_views post_views_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_views post_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: posts posts_moderated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.profiles(id);


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pricing_rules pricing_rules_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: pricing_rules pricing_rules_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: pricing_rules pricing_rules_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_videos product_videos_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_videos
    ADD CONSTRAINT product_videos_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_views product_views_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_views product_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: products products_moderated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.profiles(id);


--
-- Name: products products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: project_follows project_follows_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_follows
    ADD CONSTRAINT project_follows_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.investment_projects(id) ON DELETE CASCADE;


--
-- Name: project_follows project_follows_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_follows
    ADD CONSTRAINT project_follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: project_investments project_investments_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_investments
    ADD CONSTRAINT project_investments_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_investments project_investments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_investments
    ADD CONSTRAINT project_investments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.investment_projects(id) ON DELETE CASCADE;


--
-- Name: project_ratings project_ratings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings
    ADD CONSTRAINT project_ratings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.investment_projects(id) ON DELETE CASCADE;


--
-- Name: project_ratings project_ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings
    ADD CONSTRAINT project_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: receivables receivables_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: receivables receivables_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: receivables receivables_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.payment_transactions(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badge_definitions(id);


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_post_activity user_post_activity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_post_activity
    ADD CONSTRAINT user_post_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: verification_documents verification_documents_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_documents
    ADD CONSTRAINT verification_documents_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.payment_transactions(id) ON DELETE SET NULL;


--
-- Name: verification_documents verification_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_documents
    ADD CONSTRAINT verification_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: verification_documents verification_documents_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_documents
    ADD CONSTRAINT verification_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_actions Admins can insert admin actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert admin actions" ON public.admin_actions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: content_reports Admins can update reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update reports" ON public.content_reports FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: admin_actions Admins can view admin actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view admin actions" ON public.admin_actions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: content_reports Admins can view all reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all reports" ON public.content_reports FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: prophet_predict Allow authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert" ON public.prophet_predict FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: prophet_predict Allow authenticated update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated update" ON public.prophet_predict FOR UPDATE TO authenticated USING (true);


--
-- Name: project_ratings Allow investors to rate projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow investors to rate projects" ON public.project_ratings FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.project_investments
  WHERE ((project_investments.project_id = project_ratings.project_id) AND (project_investments.investor_id = auth.uid()) AND (project_investments.status = 'confirmed'::text)))));


--
-- Name: prophet_predict Allow public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access" ON public.prophet_predict FOR SELECT USING (true);


--
-- Name: project_ratings Allow public to view ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public to view ratings" ON public.project_ratings FOR SELECT USING (true);


--
-- Name: project_ratings Allow users to update own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to update own ratings" ON public.project_ratings FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: financial_partners Anyone authenticated can view financial partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view financial partners" ON public.financial_partners FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: contact_requests Anyone can create contact requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create contact requests" ON public.contact_requests FOR INSERT WITH CHECK (true);


--
-- Name: post_views Anyone can record post views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can record post views" ON public.post_views FOR INSERT WITH CHECK (true);


--
-- Name: product_views Anyone can record product views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can record product views" ON public.product_views FOR INSERT WITH CHECK (true);


--
-- Name: password_reset_codes Anyone can request reset codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can request reset codes" ON public.password_reset_codes FOR INSERT WITH CHECK (true);


--
-- Name: pricing_rules Anyone can view applicable pricing rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view applicable pricing rules" ON public.pricing_rules FOR SELECT USING (true);


--
-- Name: user_badges Anyone can view badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT USING (true);


--
-- Name: project_follows Anyone can view project follows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view project follows" ON public.project_follows FOR SELECT USING (true);


--
-- Name: user_follows Anyone can view user follows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view user follows" ON public.user_follows FOR SELECT USING (true);


--
-- Name: post_images Authenticated users can add post images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add post images" ON public.post_images FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.posts
  WHERE ((posts.id = post_images.post_id) AND (posts.user_id = auth.uid())))));


--
-- Name: post_videos Authenticated users can add post videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add post videos" ON public.post_videos FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.posts
  WHERE ((posts.id = post_videos.post_id) AND (posts.user_id = auth.uid())))));


--
-- Name: product_images Authenticated users can add product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add product images" ON public.product_images FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_images.product_id) AND (products.user_id = auth.uid())))));


--
-- Name: product_videos Authenticated users can add product videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add product videos" ON public.product_videos FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_videos.product_id) AND (products.user_id = auth.uid())))));


--
-- Name: post_comments Authenticated users can comment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can comment" ON public.post_comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: posts Authenticated users can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: products Authenticated users can create products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create products" ON public.products FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: investment_projects Authenticated users can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create projects" ON public.investment_projects FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: project_investments Authenticated users can invest; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can invest" ON public.project_investments FOR INSERT WITH CHECK ((auth.uid() = investor_id));


--
-- Name: comment_likes Authenticated users can like comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: post_likes Authenticated users can like posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can like posts" ON public.post_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: post_shares Authenticated users can share posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can share posts" ON public.post_shares FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: badge_definitions Badge definitions are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Badge definitions are publicly readable" ON public.badge_definitions FOR SELECT USING (true);


--
-- Name: verification_documents Business users can update verification documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Business users can update verification documents" ON public.verification_documents FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'business'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'business'::text)))));


--
-- Name: verification_documents Business users can view all verification documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Business users can view all verification documents" ON public.verification_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'business'::text)))));


--
-- Name: pricing_rules Businesses can manage pricing rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Businesses can manage pricing rules" ON public.pricing_rules USING ((auth.uid() = business_id));


--
-- Name: receivables Businesses can manage receivables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Businesses can manage receivables" ON public.receivables USING ((auth.uid() = business_id)) WITH CHECK ((auth.uid() = business_id));


--
-- Name: credit_limits Businesses can manage their credit limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Businesses can manage their credit limits" ON public.credit_limits USING ((auth.uid() = business_id));


--
-- Name: business_customer_links Businesses can update link status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Businesses can update link status" ON public.business_customer_links FOR UPDATE USING ((auth.uid() = business_id));


--
-- Name: business_customer_links Businesses can view their customer links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Businesses can view their customer links" ON public.business_customer_links FOR SELECT USING ((auth.uid() = business_id));


--
-- Name: payment_transactions Buyers can create transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can create transactions" ON public.payment_transactions FOR INSERT WITH CHECK ((auth.uid() = buyer_id));


--
-- Name: payment_installments Buyers can update installments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can update installments" ON public.payment_installments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.payment_transactions pt
  WHERE ((pt.id = payment_installments.transaction_id) AND (pt.buyer_id = auth.uid())))));


--
-- Name: payment_transactions Buyers can update own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can update own transactions" ON public.payment_transactions FOR UPDATE USING ((auth.uid() = buyer_id)) WITH CHECK ((auth.uid() = buyer_id));


--
-- Name: comment_likes Comment likes are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes FOR SELECT USING (true);


--
-- Name: post_comments Comments are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Comments are viewable by everyone" ON public.post_comments FOR SELECT USING (true);


--
-- Name: business_customer_links Customers can cancel pending links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can cancel pending links" ON public.business_customer_links FOR UPDATE USING (((auth.uid() = customer_id) AND (status = 'pending'::text)));


--
-- Name: business_customer_links Customers can create link requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create link requests" ON public.business_customer_links FOR INSERT WITH CHECK ((auth.uid() = customer_id));


--
-- Name: receivables Customers can update their receivables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can update their receivables" ON public.receivables FOR UPDATE USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: business_customer_links Customers can view their links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view their links" ON public.business_customer_links FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: receivables Customers can view their receivables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view their receivables" ON public.receivables FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: verification_documents Farmers can update own pending documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Farmers can update own pending documents" ON public.verification_documents FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = verification_documents.user_id)))) AND (status = 'pending'::text))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = verification_documents.user_id)))) AND (status = 'pending'::text)));


--
-- Name: verification_documents Farmers can upload own verification documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Farmers can upload own verification documents" ON public.verification_documents FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = verification_documents.user_id)))));


--
-- Name: verification_documents Farmers can view own verification documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Farmers can view own verification documents" ON public.verification_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = verification_documents.user_id)))));


--
-- Name: investment_projects Investment projects are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Investment projects are viewable by everyone" ON public.investment_projects FOR SELECT USING (true);


--
-- Name: project_investments Investments are viewable by project owners and investors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Investments are viewable by project owners and investors" ON public.project_investments FOR SELECT USING (((auth.uid() = investor_id) OR (auth.uid() IN ( SELECT investment_projects.user_id
   FROM public.investment_projects
  WHERE (investment_projects.id = project_investments.project_id)))));


--
-- Name: project_investments Investors can update their own investments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Investors can update their own investments" ON public.project_investments FOR UPDATE USING ((auth.uid() = investor_id));


--
-- Name: contact_requests Only admins can view contact requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view contact requests" ON public.contact_requests FOR SELECT USING (false);


--
-- Name: organizations Organizations are updatable by members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organizations are updatable by members" ON public.organizations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: organizations Organizations are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organizations are viewable by authenticated users" ON public.organizations FOR SELECT TO authenticated USING (true);


--
-- Name: post_images Post images are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Post images are viewable by everyone" ON public.post_images FOR SELECT USING (true);


--
-- Name: post_likes Post likes are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes FOR SELECT USING (true);


--
-- Name: post_shares Post shares are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Post shares are viewable by everyone" ON public.post_shares FOR SELECT USING (true);


--
-- Name: post_videos Post videos are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Post videos are viewable by everyone" ON public.post_videos FOR SELECT USING (true);


--
-- Name: post_views Post views are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Post views are viewable by everyone" ON public.post_views FOR SELECT USING (true);


--
-- Name: posts Posts are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);


--
-- Name: product_images Product images are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product images are viewable by everyone" ON public.product_images FOR SELECT USING (true);


--
-- Name: product_videos Product videos are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product videos are viewable by everyone" ON public.product_videos FOR SELECT USING (true);


--
-- Name: product_views Product views are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product views are viewable by everyone" ON public.product_views FOR SELECT USING (true);


--
-- Name: products Products are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);


--
-- Name: profiles Profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: payment_transactions Sellers can delete own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can delete own transactions" ON public.payment_transactions FOR DELETE TO authenticated USING ((seller_id = auth.uid()));


--
-- Name: POLICY "Sellers can delete own transactions" ON payment_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Sellers can delete own transactions" ON public.payment_transactions IS 'Allows sellers to delete their own transactions for order management';


--
-- Name: payment_transactions Sellers can update transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can update transactions" ON public.payment_transactions FOR UPDATE USING ((auth.uid() = seller_id)) WITH CHECK ((auth.uid() = seller_id));


--
-- Name: user_post_activity System can insert activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert activity" ON public.user_post_activity FOR INSERT WITH CHECK (true);


--
-- Name: user_badges System can insert badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert badges" ON public.user_badges FOR INSERT WITH CHECK (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: content_reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.content_reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: business_customer_links Users can delete their links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their links" ON public.business_customer_links FOR DELETE USING (((auth.uid() = business_id) OR (auth.uid() = customer_id)));


--
-- Name: post_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.post_comments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: post_images Users can delete their own post images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own post images" ON public.post_images FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.posts
  WHERE ((posts.id = post_images.post_id) AND (posts.user_id = auth.uid())))));


--
-- Name: post_videos Users can delete their own post videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own post videos" ON public.post_videos FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.posts
  WHERE ((posts.id = post_videos.post_id) AND (posts.user_id = auth.uid())))));


--
-- Name: posts Users can delete their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: product_images Users can delete their own product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own product images" ON public.product_images FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_images.product_id) AND (products.user_id = auth.uid())))));


--
-- Name: product_videos Users can delete their own product videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own product videos" ON public.product_videos FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_videos.product_id) AND (products.user_id = auth.uid())))));


--
-- Name: products Users can delete their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own products" ON public.products FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: investment_projects Users can delete their own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own projects" ON public.investment_projects FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: post_shares Users can delete their own shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own shares" ON public.post_shares FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_follows Users can follow others; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can follow others" ON public.user_follows FOR INSERT TO authenticated WITH CHECK ((auth.uid() = follower_id));


--
-- Name: project_follows Users can follow projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can follow projects" ON public.project_follows FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: user_settings Users can insert own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: password_reset_codes Users can read own reset codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own reset codes" ON public.password_reset_codes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_follows Users can unfollow; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unfollow" ON public.user_follows FOR DELETE TO authenticated USING ((auth.uid() = follower_id));


--
-- Name: project_follows Users can unfollow projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unfollow projects" ON public.project_follows FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: comment_likes Users can unlike their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unlike their own likes" ON public.comment_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: post_likes Users can unlike their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unlike their own likes" ON public.post_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: password_reset_codes Users can update own reset codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reset codes" ON public.password_reset_codes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_settings Users can update own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: post_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.post_comments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: posts Users can update their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: products Users can update their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own products" ON public.products FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: investment_projects Users can update their own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own projects" ON public.investment_projects FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: credit_limits Users can view credit limits they are involved in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view credit limits they are involved in" ON public.credit_limits FOR SELECT USING (((auth.uid() = customer_id) OR (auth.uid() = business_id)));


--
-- Name: POLICY "Users can view credit limits they are involved in" ON credit_limits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can view credit limits they are involved in" ON public.credit_limits IS 'Allows both customers and businesses to view credit limits where they are involved';


--
-- Name: user_post_activity Users can view own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own activity" ON public.user_post_activity FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_settings Users can view own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: payment_transactions Users can view own transactions as buyer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions as buyer" ON public.payment_transactions FOR SELECT USING ((auth.uid() = buyer_id));


--
-- Name: payment_transactions Users can view own transactions as seller; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions as seller" ON public.payment_transactions FOR SELECT USING ((auth.uid() = seller_id));


--
-- Name: payment_installments Users can view their installments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their installments" ON public.payment_installments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.payment_transactions pt
  WHERE ((pt.id = payment_installments.transaction_id) AND ((pt.buyer_id = auth.uid()) OR (pt.seller_id = auth.uid()))))));


--
-- Name: content_reports Users can view their own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reports" ON public.content_reports FOR SELECT TO authenticated USING ((auth.uid() = reporter_id));


--
-- Name: admin_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: badge_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: business_customer_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_customer_links ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: content_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_partners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_partners ENABLE ROW LEVEL SECURITY;

--
-- Name: investment_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investment_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: password_reset_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_installments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: post_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: post_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

--
-- Name: post_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: post_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: post_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: post_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: product_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: product_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_follows ENABLE ROW LEVEL SECURITY;

--
-- Name: project_investments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_investments ENABLE ROW LEVEL SECURITY;

--
-- Name: project_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: prophet_predict; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prophet_predict ENABLE ROW LEVEL SECURITY;

--
-- Name: receivables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

--
-- Name: user_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

--
-- Name: user_post_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_post_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict h5eYxzPZsdgEwUbqowC7vKlvDRiCzVCY9OX2a55rLYIg2I0RoWFD6IkJBgTSxWz

