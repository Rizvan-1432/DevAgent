function redactSecrets(text) {
  let out = String(text || '');
  out = out.replace(/\b(ghp_|gho_|github_pat_)[A-Za-z0-9_]{10,}\b/g, '$1••••');
  out = out.replace(/\b(crsr_|key_)[A-Za-z0-9_-]{10,}\b/g, '$1••••');
  out = out.replace(/\b(Bearer\s+)[A-Za-z0-9._\-]+/gi, '$1••••');
  out = out.replace(/(CURSOR_API_KEY|GITHUB_TOKEN|VERCEL_TOKEN)=([^\s"'\\]+)/gi, '$1=••••');
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]');
  return out;
}

function mapErrorToRu(err) {
  const msg = String(err?.message || err || '');
  const lower = msg.toLowerCase();

  if (/invalid.*api.*key|unauthorized|401/.test(lower)) {
    return 'Ключ Cursor отозван или неверный. Создайте новый: cursor.com → Settings → API Keys.';
  }
  if (/network request failed|fetch failed|enotfound|econnrefused|etimedout|offline/.test(lower)) {
    return 'Нет интернета или сервер Cursor недоступен. Проверьте сеть / VPN.';
  }
  if (/write access|permission denied|403/.test(lower) && /git|github/.test(lower)) {
    return 'Нет прав на GitHub (нужен Write для Contents). Проверьте GITHUB_TOKEN.';
  }
  if (/authentication failed|invalid credentials/.test(lower)) {
    return 'GitHub не принял токен. Обновите GITHUB_TOKEN (длинный fine-grained PAT).';
  }
  if (/rg.*enoent|spawn.*rg/.test(lower)) {
    return 'Не найден поисковик rg. Переустановите Dev Agent или нажмите «Обновить skills».';
  }
  if (/kit не найден/.test(lower)) {
    return 'Не найден набор skills. Нажмите «Обновить skills» или переустановите приложение 2.2+.';
  }
  return redactSecrets(msg);
}

module.exports = { redactSecrets, mapErrorToRu };
