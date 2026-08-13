-- Elimina filas de TenantFeatureFlag con el vocabulario antiguo, nunca consumido
-- por ningún controller/service (streaming/obituaries/leads sí coinciden con el
-- nuevo vocabulario y se conservan; el resto se descarta).
DELETE FROM "TenantFeatureFlag"
WHERE feature IN ('allies_store', 'album', 'permanent_memorial', 'service_management');

-- Backfill: todo tenant existente arranca con los 8 módulos configurables
-- activados (nadie pierde acceso el día del deploy — el Super Admin restringe
-- manualmente a los tenants que lo necesiten después).
INSERT INTO "TenantFeatureFlag" (id, "tenantId", feature, enabled, "createdAt")
SELECT gen_random_uuid()::text, t.id, m.feature, true, now()
FROM "Tenant" t
CROSS JOIN (VALUES
  ('obituaries'),
  ('streaming'),
  ('invitations'),
  ('tribute_book'),
  ('clients'),
  ('leads'),
  ('venues'),
  ('downloads')
) AS m(feature)
ON CONFLICT ("tenantId", "feature") DO UPDATE SET enabled = true;
