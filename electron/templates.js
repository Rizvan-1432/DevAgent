const TASK_TEMPLATES = [
  {
    id: 'fix-form',
    label: 'Починить форму',
    mode: 'custom',
    prompt:
      'Найди контактные/заявочные формы на сайте, проверь отправку, валидацию, сообщения об ошибках и спам-защиту. Исправь критичные проблемы и опиши результат по-русски.',
  },
  {
    id: 'speed-up',
    label: 'Ускорить сайт',
    mode: 'custom',
    prompt:
      'Сделай performance-аудит: тяжёлые изображения, лишний JS/CSS, шрифты, lazy-loading. Внедри быстрые безопасные улучшения и отчёт по-русски.',
  },
  {
    id: 'prep-release',
    label: 'К релизу',
    mode: 'release-checklist',
    prompt: '',
  },
  {
    id: 'security-quick',
    label: 'Безопасность',
    mode: 'security',
    prompt: '',
  },
  {
    id: 'seo-quick',
    label: 'SEO за час',
    mode: 'seo',
    prompt: '',
  },
  {
    id: 'tz',
    label: 'ТЗ по заказу',
    mode: 'freelance-tz',
    prompt: '',
  },
  {
    id: 'client-mail',
    label: 'Письмо клиенту',
    mode: 'freelance-email',
    prompt: '',
  },
  {
    id: 'estimate',
    label: 'Смета',
    mode: 'freelance-estimate',
    prompt: '',
  },
];

module.exports = { TASK_TEMPLATES };
