/*
# Iraq Queen — Customer list function (admin only)

- get_customer_list(): returns customer accounts with order count, total spent, last order date
*/

CREATE OR REPLACE FUNCTION public.get_customer_list()
RETURNS TABLE (
  user_id uuid, email text, created_at timestamptz,
  order_count bigint, total_spent bigint, last_order_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 'BEGIN IF NOT public.is_admin() THEN RAISE EXCEPTION ''Admin access required''; END IF; SELECT u.id, u.email, u.created_at, COALESCE(o.cnt, 0), COALESCE(o.spent, 0), o.last_date FROM users u LEFT JOIN (SELECT customer_id, count(*) as cnt, SUM(total) as spent, max(created_at) as last_date FROM orders WHERE status != ''cancelled'' GROUP BY customer_id) o ON o.customer_id = u.id WHERE u.role = ''customer'' ORDER BY u.created_at DESC; END;';
