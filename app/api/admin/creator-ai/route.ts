import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CreatorAction = "analyze_asset" | "create_idea" | "analyze_link";

function formValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireActiveAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, access_status")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" && profile.access_status === "active";
}

async function fileToDataUrl(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

function buildInstructions() {
  return [
    "Ты личный AI-стратег для опытного блогера Lumina.",
    "Твоя специализация: TikTok, YouTube Shorts, Instagram Reels, Instagram posts, Pinterest, удержание внимания, hooks, сценарии, скетчи, провокационные заходы и анализ контента.",
    "Пиши по-русски. Ответ должен быть коротким, плотным и прикладным.",
    "Пользователь опытный блогер. Не объясняй очевидное. Не расписывай взгляд, интонацию, микропаузу, постановку кадра и длинную режиссуру, если тебя прямо не попросили.",
    "Не делай длинных лекций, диагнозов, вступлений и философии. Не используй разделы с десятками вариантов.",
    "Не выдавай больше 6 hooks и больше 3 вариантов фраз в одной категории.",
    "Не используй банальные советы вроде 'будь собой', 'добавь эмоций', 'сделай качественный контент'.",
    "Тон: умно, дерзко, честно, прикладно. Можно предлагать провокационные формулировки, но без травли, дискриминации, сексуализации несовершеннолетних, угроз, обмана и опасных инструкций.",
    "Не обещай гарантированную вирусность. Вместо этого объясняй, почему конкретный hook может сработать.",
    "Формат ответа максимум 1200-1800 знаков, если пользователь не просит подробнее.",
    "Структура ответа: 1) Суть идеи в 1-2 строках. 2) 5-6 hooks. 3) Короткий скелет: начало, поворот, финал. 4) 3 ключевые фразы.",
    "Если нужно больше, закончи фразой: 'Могу развернуть в 3 версии: ядовитая / умная / мемная.'"
  ].join("\n");
}

function buildUserPrompt({
  action,
  platform,
  prompt,
  context,
  angles,
  audience,
  emotions,
  linkMode,
  url,
  file
}: {
  action: CreatorAction;
  platform: string;
  prompt: string;
  context: string;
  angles: string;
  audience: string;
  emotions: string;
  linkMode: string;
  url: string;
  file: File | null;
}) {
  if (action === "create_idea") {
    return [
      `Платформа: ${platform}`,
      `Задача: ${prompt || "придумать сильный сценарий для короткого видео"}`,
      `Контекст/ограничения: ${context || "сделай цепко, но не банально"}`,
      `Угол: ${angles || "без уточнения"}`,
      `Аудитория: ${audience || "без уточнения"}`,
      `Эмоция: ${emotions || "без уточнения"}`,
      "",
      "Собери сценарий с нуля:",
      "- 5-6 hook-вариантов;",
      "- один лучший угол подачи;",
      "- короткий скелет: начало, поворот, финал;",
      "- 3 ключевые фразы для текста на экране или реплик;",
      "- 2 варианта подписи/CTA.",
      "Не расписывай длинные сцены. Не объясняй очевидное. Не превышай 1800 знаков."
    ].join("\n");
  }

  if (action === "analyze_link") {
    return [
      `Тип анализа: ${linkMode === "profile" ? "профиль целиком" : "одно опубликованное видео"}`,
      `Ссылка: ${url || "ссылка не указана"}`,
      `Угол: ${angles || "без уточнения"}`,
      `Аудитория: ${audience || "без уточнения"}`,
      `Эмоция: ${emotions || "без уточнения"}`,
      "",
      "Важно: если у тебя нет доступа к содержимому ссылки, честно скажи, что нужен импорт статистики/скриншоты/видео. Но всё равно подготовь точную схему анализа и чеклист, что именно надо оценить.",
    "Дай короткий практичный разбор: что смотреть, что повторить, какие hooks/темы попробовать и где точка роста. Не превышай 1800 знаков."
    ].join("\n");
  }

  return [
    `Платформа: ${platform}`,
    `Файл: ${file ? `${file.name} (${file.type || "unknown"}, ${file.size} bytes)` : "не загружен"}`,
    `Запрос: ${prompt || "проанализируй материал и предложи улучшения"}`,
    `Контекст: ${context || "без дополнительного контекста"}`,
    `Угол: ${angles || "без уточнения"}`,
    `Аудитория: ${audience || "без уточнения"}`,
    `Эмоция: ${emotions || "без уточнения"}`,
    "",
    file?.type.startsWith("video/")
      ? "Файл является видео. Если прямой просмотр видео недоступен, дай максимально полезный анализ по контексту и попроси на следующем шаге извлечь кадры/транскрипт."
      : "Если доступно изображение, оцени первый визуальный импульс, композицию, текст, интригу и потенциал удержания.",
    "",
    "Сделай короткий разбор: сильные стороны, слабые места, 5 hooks, 3 заголовка и что усилить. Не превышай 1800 знаков."
  ].join("\n");
}

function extractOutputText(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "output_text" in data &&
    typeof (data as { output_text?: unknown }).output_text === "string"
  ) {
    return (data as { output_text: string }).output_text;
  }

  const output = (data as { output?: Array<{ content?: Array<{ text?: string }> }> })?.output;
  const text = output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter(Boolean)
    .join("\n\n");

  return text || "";
}

export async function POST(request: Request) {
  try {
    const isAdmin = await requireActiveAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY не задан в .env.local. Добавь ключ и перезапусти сайт." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const action = formValue(formData.get("action")) as CreatorAction;
    const platform = formValue(formData.get("platform"));
    const prompt = formValue(formData.get("prompt"));
    const context = formValue(formData.get("context"));
    const angles = formValue(formData.get("angles"));
    const audience = formValue(formData.get("audience"));
    const emotions = formValue(formData.get("emotions"));
    const linkMode = formValue(formData.get("linkMode"));
    const url = formValue(formData.get("url"));
    const fileValue = formData.get("file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (!["analyze_asset", "create_idea", "analyze_link"].includes(action)) {
      return NextResponse.json({ error: "Неизвестный тип AI-запроса." }, { status: 400 });
    }

    const userPrompt = buildUserPrompt({
      action,
      platform,
      prompt,
      context,
      angles,
      audience,
      emotions,
      linkMode,
      url,
      file
    });

    const content: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string; detail: "auto" }
    > = [{ type: "input_text", text: userPrompt }];

    if (file?.type.startsWith("image/") && file.size <= 8 * 1024 * 1024) {
      content.push({
        type: "input_image",
        image_url: await fileToDataUrl(file),
        detail: "auto"
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_CREATOR_MODEL || "gpt-5.4",
        max_output_tokens: 900,
        reasoning: {
          effort: "low"
        },
        instructions: buildInstructions(),
        input: [
          {
            role: "user",
            content
          }
        ]
      })
    });
    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "OpenAI вернул ошибку." },
        { status: response.status }
      );
    }

    const text = extractOutputText(data);

    return NextResponse.json({
      text: text || "AI не вернул текст. Попробуй уточнить запрос."
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "OpenAI слишком долго отвечает. Попробуй короче запрос или нажми ещё раз." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось выполнить AI-запрос." },
      { status: 500 }
    );
  }
}
