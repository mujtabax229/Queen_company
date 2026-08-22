/*
# Iraq Queen — Store analytics + customer list functions

- get_store_analytics(p_range): dashboard stats with date filtering (staff only)
- get_customer_list(): customer accounts with order stats (admin only)
*/

CREATE OR REPLACE FUNCTION public.get_store_analytics(p_range text DEFAULT 'all')
RETURNS TABLE (
  total_products bigint, available_products bigint, out_of_stock_products bigint,
  total_orders bigint, new_orders bigint, completed_orders bigint, cancelled_orders bigint,
  total_sales bigint, total_views bigint,
  most_viewed_product text, most_viewed_views bigint,
  most_ordered_product text, most_ordered_qty bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 'DECLARE date_filter timestamptz; BEGIN IF NOT public.is_staff() THEN RAISE EXCEPTION ''Staff access required''; END IF; date_filter := CASE p_range WHEN ''today'' THEN date_trunc(''day'', now()) WHEN ''7d'' THEN now() - interval ''7 days'' WHEN ''30d'' THEN now() - interval ''30 days'' WHEN ''month'' THEN date_trunc(''month'', now()) ELSE ''1900-01-01''::timestamptz END; SELECT (SELECT count(*) FROM products WHERE status != ''draft''), (SELECT count(*) FROM products WHERE status = ''available''), (SELECT count(*) FROM products WHERE status = ''out_of_stock''), (SELECT count(*) FROM orders WHERE created_at >= date_filter), (SELECT count(*) FROM orders WHERE created_at >= date_filter AND status = ''new''), (SELECT count(*) FROM orders WHERE created_at >= date_filter AND status = ''completed''), (SELECT count(*) FROM orders WHERE created_at >= date_filter AND status = ''cancelled''), (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at >= date_filter AND status != ''cancelled''), (SELECT count(*) FROM product_views WHERE viewed_at >= date_filter), (SELECT p.name FROM product_views pv JOIN products p ON p.id = pv.product_id WHERE pv.viewed_at >= date_filter GROUP BY p.id, p.name ORDER BY count(*) DESC LIMIT 1), (SELECT count(*) FROM product_views pv WHERE pv.viewed_at >= date_filter GROUP BY pv.product_id ORDER BY count(*) DESC LIMIT 1), (SELECT p.name FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id WHERE o.created_at >= date_filter AND o.status != ''cancelled'' GROUP BY p.id, p.name ORDER BY SUM(oi.quantity) DESC LIMIT 1), (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.created_at >= date_filter AND o.status != ''cancelled'' GROUP BY oi.product_id ORDER BY SUM(oi.quantity) DESC LIMIT 1) INTO total_products, available_products, out_of_stock_products, total_orders, new_orders, completed_orders, cancelled_orders, total_sales, total_views, most_viewed_product, most_viewed_views, most_ordered_product, most_ordered_qty; END;';
