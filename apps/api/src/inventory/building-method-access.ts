/**
 * 建築允許的生產規則 ID 列表。
 * 空陣列表示不可開工（例如倉庫）；僅列內 rule 對應的方式可 start。
 */
export function isMethodAllowedForBuilding(
  allowedRuleIds: string[] | null | undefined,
  methodRuleId: string,
): boolean {
  const allowed = allowedRuleIds ?? [];
  return allowed.includes(methodRuleId);
}
