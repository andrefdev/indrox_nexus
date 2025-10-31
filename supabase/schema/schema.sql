

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."nc_item_type_enum" AS ENUM (
    'PRODUCTO_SIMPLE',
    'PAQUETE_FIJO',
    'COMBO_MIXTO'
);


ALTER TYPE "public"."nc_item_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_count" integer DEFAULT NULL::integer, "filter" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" bigint, "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_count" integer, "filter" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" bigint NOT NULL,
    "content" "text",
    "metadata" "jsonb",
    "embedding" "extensions"."vector"(1536)
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."documents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."documents_id_seq" OWNED BY "public"."documents"."id";



CREATE TABLE IF NOT EXISTS "public"."nc_combo_headers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "combo_name" "text" NOT NULL,
    "combo_price" numeric NOT NULL,
    "currency" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nc_combo_headers_combo_price_check" CHECK (("combo_price" >= (0)::numeric))
);


ALTER TABLE "public"."nc_combo_headers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_combo_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "combo_id" "uuid" NOT NULL,
    "component_item_id" "uuid" NOT NULL,
    "component_qty" integer NOT NULL,
    "consume_stock" boolean DEFAULT true NOT NULL,
    CONSTRAINT "nc_combo_items_component_qty_check" CHECK (("component_qty" > 0))
);


ALTER TABLE "public"."nc_combo_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_customer_services" (
    "user_id" "uuid" NOT NULL,
    "service_code" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nc_customer_services_service_code_check" CHECK (("service_code" = ANY (ARRAY['buildpro'::"text", 'neurocore'::"text"])))
);


ALTER TABLE "public"."nc_customer_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_customers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "segment" "text" NOT NULL,
    "last_purchase_at" timestamp with time zone,
    "ltv" numeric,
    "churn_rate" numeric,
    "purchase_frequency" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "client_id" "uuid",
    CONSTRAINT "nc_customers_segment_check" CHECK (("segment" = ANY (ARRAY['nuevo'::"text", 'activo'::"text", 'inactivo'::"text"])))
);


ALTER TABLE "public"."nc_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_exports_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "format" "text" NOT NULL,
    "filters" "jsonb",
    "record_count" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nc_exports_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "feature_code" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nc_feature_flags_feature_code_check" CHECK (("feature_code" = 'NC_INVENTORY_COMBOS'::"text"))
);


ALTER TABLE "public"."nc_feature_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_inventory_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "threshold" integer NOT NULL,
    "channel" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nc_inventory_alerts_channel_check" CHECK (("channel" = ANY (ARRAY['portal'::"text", 'email'::"text"])))
);


ALTER TABLE "public"."nc_inventory_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "warehouse" "text" NOT NULL,
    "status" "text" NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "min_stock_threshold" integer DEFAULT 0 NOT NULL,
    "rotation_rate" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "item_type" "public"."nc_item_type_enum" DEFAULT 'PRODUCTO_SIMPLE'::"public"."nc_item_type_enum" NOT NULL,
    "unit_price" numeric,
    "client_id" "uuid",
    "image_url" "text"
);


ALTER TABLE "public"."nc_inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "qty" integer NOT NULL,
    "exploded_from_item_id" "uuid",
    "components_consumed" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nc_inventory_movements_source_check" CHECK (("source" = ANY (ARRAY['ventas'::"text", 'ajuste'::"text", 'combo'::"text"])))
);


ALTER TABLE "public"."nc_inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "module_code" "text" NOT NULL,
    "level" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    CONSTRAINT "nc_notifications_level_check" CHECK (("level" = ANY (ARRAY['info'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."nc_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_package_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "base_item_id" "uuid" NOT NULL,
    "quantity_included" integer NOT NULL,
    "package_price" numeric NOT NULL,
    "consume_stock" boolean DEFAULT true NOT NULL,
    "currency" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nc_package_definitions_package_price_check" CHECK (("package_price" >= (0)::numeric)),
    CONSTRAINT "nc_package_definitions_quantity_included_check" CHECK (("quantity_included" > 0))
);


ALTER TABLE "public"."nc_package_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_sales_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" timestamp with time zone NOT NULL,
    "channel" "text" NOT NULL,
    "product_id" "text" NOT NULL,
    "qty" integer DEFAULT 1 NOT NULL,
    "total_amount" numeric NOT NULL,
    "currency" "text" NOT NULL,
    "customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "client_id" "uuid"
);


ALTER TABLE "public"."nc_sales_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_sync_status" (
    "module_code" "text" NOT NULL,
    "last_sync_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."nc_sync_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nc_user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nc_user_roles_role_check" CHECK (("role" = ANY (ARRAY['Admin Cliente'::"text", 'Usuario Cliente'::"text"])))
);


ALTER TABLE "public"."nc_user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."documents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."documents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_combo_headers"
    ADD CONSTRAINT "nc_combo_headers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_combo_items"
    ADD CONSTRAINT "nc_combo_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_customer_services"
    ADD CONSTRAINT "nc_customer_services_pkey" PRIMARY KEY ("user_id", "service_code");



ALTER TABLE ONLY "public"."nc_customers"
    ADD CONSTRAINT "nc_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_exports_audit"
    ADD CONSTRAINT "nc_exports_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_feature_flags"
    ADD CONSTRAINT "nc_feature_flags_client_id_feature_code_key" UNIQUE ("client_id", "feature_code");



ALTER TABLE ONLY "public"."nc_feature_flags"
    ADD CONSTRAINT "nc_feature_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_inventory_alerts"
    ADD CONSTRAINT "nc_inventory_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_inventory_items"
    ADD CONSTRAINT "nc_inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_inventory_movements"
    ADD CONSTRAINT "nc_inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_notifications"
    ADD CONSTRAINT "nc_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_package_definitions"
    ADD CONSTRAINT "nc_package_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_sales_orders"
    ADD CONSTRAINT "nc_sales_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nc_sync_status"
    ADD CONSTRAINT "nc_sync_status_pkey" PRIMARY KEY ("module_code");



ALTER TABLE ONLY "public"."nc_user_roles"
    ADD CONSTRAINT "nc_user_roles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_nc_combo_active" ON "public"."nc_combo_headers" USING "btree" ("is_active");



CREATE INDEX "idx_nc_combo_client" ON "public"."nc_combo_headers" USING "btree" ("client_id");



CREATE INDEX "idx_nc_combo_items_combo" ON "public"."nc_combo_items" USING "btree" ("combo_id");



CREATE INDEX "idx_nc_combo_items_component" ON "public"."nc_combo_items" USING "btree" ("component_item_id");



CREATE INDEX "idx_nc_customer_services_user" ON "public"."nc_customer_services" USING "btree" ("user_id");



CREATE INDEX "idx_nc_customers_client" ON "public"."nc_customers" USING "btree" ("client_id");



CREATE INDEX "idx_nc_customers_segment" ON "public"."nc_customers" USING "btree" ("segment");



CREATE INDEX "idx_nc_exports_user" ON "public"."nc_exports_audit" USING "btree" ("user_id");



CREATE INDEX "idx_nc_inventory_category" ON "public"."nc_inventory_items" USING "btree" ("category");



CREATE INDEX "idx_nc_inventory_client" ON "public"."nc_inventory_items" USING "btree" ("client_id");



CREATE INDEX "idx_nc_inventory_status" ON "public"."nc_inventory_items" USING "btree" ("status");



CREATE INDEX "idx_nc_inventory_warehouse" ON "public"."nc_inventory_items" USING "btree" ("warehouse");



CREATE INDEX "idx_nc_mov_client" ON "public"."nc_inventory_movements" USING "btree" ("client_id");



CREATE INDEX "idx_nc_mov_item" ON "public"."nc_inventory_movements" USING "btree" ("item_id");



CREATE INDEX "idx_nc_mov_source" ON "public"."nc_inventory_movements" USING "btree" ("source");



CREATE INDEX "idx_nc_package_base_item" ON "public"."nc_package_definitions" USING "btree" ("base_item_id");



CREATE INDEX "idx_nc_package_client" ON "public"."nc_package_definitions" USING "btree" ("client_id");



CREATE INDEX "idx_nc_sales_channel" ON "public"."nc_sales_orders" USING "btree" ("channel");



CREATE INDEX "idx_nc_sales_client" ON "public"."nc_sales_orders" USING "btree" ("client_id");



CREATE INDEX "idx_nc_sales_date" ON "public"."nc_sales_orders" USING "btree" ("date");



ALTER TABLE ONLY "public"."nc_combo_headers"
    ADD CONSTRAINT "nc_combo_headers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_combo_items"
    ADD CONSTRAINT "nc_combo_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."nc_combo_headers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_combo_items"
    ADD CONSTRAINT "nc_combo_items_component_item_id_fkey" FOREIGN KEY ("component_item_id") REFERENCES "public"."nc_inventory_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nc_customers"
    ADD CONSTRAINT "nc_customers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_exports_audit"
    ADD CONSTRAINT "nc_exports_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_feature_flags"
    ADD CONSTRAINT "nc_feature_flags_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_inventory_alerts"
    ADD CONSTRAINT "nc_inventory_alerts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_inventory_items"
    ADD CONSTRAINT "nc_inventory_items_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_inventory_movements"
    ADD CONSTRAINT "nc_inventory_movements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_inventory_movements"
    ADD CONSTRAINT "nc_inventory_movements_exploded_from_item_id_fkey" FOREIGN KEY ("exploded_from_item_id") REFERENCES "public"."nc_combo_headers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nc_inventory_movements"
    ADD CONSTRAINT "nc_inventory_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."nc_inventory_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nc_notifications"
    ADD CONSTRAINT "nc_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nc_package_definitions"
    ADD CONSTRAINT "nc_package_definitions_base_item_id_fkey" FOREIGN KEY ("base_item_id") REFERENCES "public"."nc_inventory_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nc_package_definitions"
    ADD CONSTRAINT "nc_package_definitions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nc_sales_orders"
    ADD CONSTRAINT "nc_sales_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "delete combo items via combo ownership" ON "public"."nc_combo_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."nc_combo_headers" "ch"
  WHERE (("ch"."id" = "nc_combo_items"."combo_id") AND ("ch"."client_id" = "auth"."uid"())))));



CREATE POLICY "delete own combos" ON "public"."nc_combo_headers" FOR DELETE TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "delete own items" ON "public"."nc_inventory_items" FOR DELETE TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "delete own packages" ON "public"."nc_package_definitions" FOR DELETE TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "exports by self" ON "public"."nc_exports_audit" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "insert combo items via combo ownership" ON "public"."nc_combo_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."nc_combo_headers" "ch"
  WHERE (("ch"."id" = "nc_combo_items"."combo_id") AND ("ch"."client_id" = "auth"."uid"())))));



CREATE POLICY "insert exports" ON "public"."nc_exports_audit" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert own alerts" ON "public"."nc_inventory_alerts" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "insert own combos" ON "public"."nc_combo_headers" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "client_id"));



CREATE POLICY "insert own features" ON "public"."nc_feature_flags" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "client_id"));



CREATE POLICY "insert own items" ON "public"."nc_inventory_items" FOR INSERT TO "authenticated" WITH CHECK (("client_id" = "auth"."uid"()));



CREATE POLICY "insert own notifications" ON "public"."nc_notifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "insert own packages" ON "public"."nc_package_definitions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "client_id"));



CREATE POLICY "insert own sales" ON "public"."nc_sales_orders" FOR INSERT TO "authenticated" WITH CHECK (("client_id" = "auth"."uid"()));



ALTER TABLE "public"."nc_combo_headers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_combo_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_customer_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_exports_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_feature_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_inventory_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_inventory_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_package_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_sales_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_sync_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nc_user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read combo items via combo ownership" ON "public"."nc_combo_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."nc_combo_headers" "ch"
  WHERE (("ch"."id" = "nc_combo_items"."combo_id") AND ("ch"."client_id" = "auth"."uid"())))));



CREATE POLICY "read own active services" ON "public"."nc_customer_services" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("active" = true)));



CREATE POLICY "read own alerts" ON "public"."nc_inventory_alerts" FOR SELECT TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "read own combos" ON "public"."nc_combo_headers" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "client_id"));



CREATE POLICY "read own customers" ON "public"."nc_customers" FOR SELECT TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "read own features" ON "public"."nc_feature_flags" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "client_id"));



CREATE POLICY "read own items" ON "public"."nc_inventory_items" FOR SELECT TO "authenticated" USING ((("client_id" IS NULL) OR ("client_id" = "auth"."uid"())));



CREATE POLICY "read own movements" ON "public"."nc_inventory_movements" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "client_id"));



CREATE POLICY "read own notifications" ON "public"."nc_notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "read own packages" ON "public"."nc_package_definitions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "client_id"));



CREATE POLICY "read own sales" ON "public"."nc_sales_orders" FOR SELECT TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "read sync status" ON "public"."nc_sync_status" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "roles by self" ON "public"."nc_user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "update combo items via combo ownership" ON "public"."nc_combo_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."nc_combo_headers" "ch"
  WHERE (("ch"."id" = "nc_combo_items"."combo_id") AND ("ch"."client_id" = "auth"."uid"())))));



CREATE POLICY "update own combos" ON "public"."nc_combo_headers" FOR UPDATE TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "update own customers" ON "public"."nc_customers" FOR UPDATE TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "update own items" ON "public"."nc_inventory_items" FOR UPDATE TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "update own packages" ON "public"."nc_package_definitions" FOR UPDATE TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "upsert own customers" ON "public"."nc_customers" FOR INSERT TO "authenticated" WITH CHECK (("client_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";













































































































































































































































































































































































































































































































































GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."nc_combo_headers" TO "anon";
GRANT ALL ON TABLE "public"."nc_combo_headers" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_combo_headers" TO "service_role";



GRANT ALL ON TABLE "public"."nc_combo_items" TO "anon";
GRANT ALL ON TABLE "public"."nc_combo_items" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_combo_items" TO "service_role";



GRANT ALL ON TABLE "public"."nc_customer_services" TO "anon";
GRANT ALL ON TABLE "public"."nc_customer_services" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_customer_services" TO "service_role";



GRANT ALL ON TABLE "public"."nc_customers" TO "anon";
GRANT ALL ON TABLE "public"."nc_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_customers" TO "service_role";



GRANT ALL ON TABLE "public"."nc_exports_audit" TO "anon";
GRANT ALL ON TABLE "public"."nc_exports_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_exports_audit" TO "service_role";



GRANT ALL ON TABLE "public"."nc_feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."nc_feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."nc_inventory_alerts" TO "anon";
GRANT ALL ON TABLE "public"."nc_inventory_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_inventory_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."nc_inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."nc_inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."nc_inventory_movements" TO "anon";
GRANT ALL ON TABLE "public"."nc_inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_inventory_movements" TO "service_role";



GRANT ALL ON TABLE "public"."nc_notifications" TO "anon";
GRANT ALL ON TABLE "public"."nc_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."nc_package_definitions" TO "anon";
GRANT ALL ON TABLE "public"."nc_package_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_package_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."nc_sales_orders" TO "anon";
GRANT ALL ON TABLE "public"."nc_sales_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_sales_orders" TO "service_role";



GRANT ALL ON TABLE "public"."nc_sync_status" TO "anon";
GRANT ALL ON TABLE "public"."nc_sync_status" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_sync_status" TO "service_role";



GRANT ALL ON TABLE "public"."nc_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."nc_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."nc_user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























