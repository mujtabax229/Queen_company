/*
# Iraq Queen — Analytics functions (product, store, customers)

- get_product_analytics: per-product views/orders/qty/sales (admin only, cancelled excluded)
- get_store_analytics: dashboard stats with date range filter (staff)
- get_customer_list: customer accounts with order stats (admin only)
*/

CREATE OR REPLACE FUNCTION public.get_product_analytics(p_product_id uuid)
RETURNS TABLE (
  views bigint, distinct_orders bigint, total_quantity bigint, total_sales bigint,
  published_date timestamptz, last_view timestamptz, last_order timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 'BEGIN IF NOT public.is_admin() THEN RAISE EXCEPTION ''Admin access required''; END IF; SELECT (SELECT count(*) FROM product_views WHERE product_id = p_product_id), (SELECT count(DISTINCT oi.order_id) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p_product_id AND o.status != ''cancelled''), (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p_product_id AND o.status != ''cancelled''), (SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p_product_id AND o.status != ''cancelled''), (SELECT first_published_at FROM products WHERE id = p_product_id), (SELECT max(viewed_at) FROM product_views WHERE product_id = p_product_id), (SELECT max(o.created_at) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p_product_id AND o.status != ''cancelled'') INTO views, distinct_orders, total_quantity, total_sales, published_date, last_view, last_order; END;';
