import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const telegramSupportMethodSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(2).max(80),
  value: z.string().trim().min(1).max(600),
  note: z.string().trim().max(600).optional().default(""),
  sortOrder: z.number().int().min(0).max(999).default(0)
});

type TelegramSupportMethod = z.infer<typeof telegramSupportMethodSchema> & {
  updatedAt?: string;
  updatedBy?: string | null;
};

type TelegramSupportSettings = {
  methods: TelegramSupportMethod[];
};

type TelegramSupportMethodRow = {
  id: string;
  label: string | null;
  value: string | null;
  note: string | null;
  sort_order: number | null;
  updated_at?: string;
  updated_by?: string | null;
};

type LegacyTelegramSupportSettingsRow = {
  card_label: string | null;
  card_number: string | null;
  note: string | null;
  updated_at?: string;
  updated_by?: string | null;
};

function getDefaultTelegramSupportMethods(): TelegramSupportMethod[] {
  const label = process.env.NEXT_PUBLIC_SUPPORT_CARD_LABEL?.trim() || "Карта";
  const value = process.env.NEXT_PUBLIC_SUPPORT_CARD_NUMBER?.trim() || "";
  const note = process.env.NEXT_PUBLIC_SUPPORT_DONATION_NOTE?.trim() || "";

  if (!value && !note) {
    return [];
  }

  return [
    {
      id: "00000000-0000-0000-0000-000000000001",
      label,
      value,
      note,
      sortOrder: 0
    }
  ];
}

function normalizeMethod(input: {
  id?: string;
  label: string;
  value: string;
  note?: string;
  sortOrder?: number;
  updatedAt?: string;
  updatedBy?: string | null;
}) {
  return {
    id: input.id,
    label: input.label,
    value: input.value,
    note: input.note ?? "",
    sortOrder: input.sortOrder ?? 0,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy ?? null
  } satisfies TelegramSupportMethod;
}

export async function getTelegramSupportSettings(): Promise<TelegramSupportSettings> {
  const fallbackMethods = getDefaultTelegramSupportMethods();

  try {
    const admin = createAdminSupabaseClient();
    const { data: methodsData, error: methodsError } = await admin
      .from("telegram_support_methods")
      .select("id, label, value, note, sort_order, updated_at, updated_by")
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: true });

    if (!methodsError && methodsData?.length) {
      const methods = (methodsData as TelegramSupportMethodRow[])
        .map((row) =>
          telegramSupportMethodSchema.safeParse({
            id: row.id,
            label: row.label ?? "",
            value: row.value ?? "",
            note: row.note ?? "",
            sortOrder: row.sort_order ?? 0
          }).success
            ? normalizeMethod({
                id: row.id,
                label: row.label ?? "",
                value: row.value ?? "",
                note: row.note ?? "",
                sortOrder: row.sort_order ?? 0,
                updatedAt: row.updated_at,
                updatedBy: row.updated_by ?? null
              })
            : null
        )
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (methods.length) {
        return { methods };
      }
    }

    const { data: legacyData } = await admin
      .from("telegram_support_settings")
      .select("card_label, card_number, note, updated_at, updated_by")
      .eq("id", true)
      .maybeSingle();

    if (legacyData) {
      const row = legacyData as LegacyTelegramSupportSettingsRow;
      const label = (row.card_label ?? "").trim() || "Карта";
      const value = (row.card_number ?? "").trim();
      const note = (row.note ?? "").trim();

      if (value || note) {
        return {
          methods: [
            normalizeMethod({
              id: "00000000-0000-0000-0000-000000000001",
              label,
              value,
              note,
              sortOrder: 0,
              updatedAt: row.updated_at,
              updatedBy: row.updated_by ?? null
            })
          ]
        };
      }
    }
  } catch {
    return { methods: fallbackMethods };
  }

  return { methods: fallbackMethods };
}

export async function saveTelegramSupportMethod(
  method: {
    id?: string;
    label: string;
    value: string;
    note?: string;
    sortOrder?: number;
  },
  updatedBy: string | null
) {
  const parsed = telegramSupportMethodSchema.parse({
    ...method,
    note: method.note ?? "",
    sortOrder: method.sortOrder ?? 0
  });
  const admin = createAdminSupabaseClient();
  const safeUpdatedBy = z.string().uuid().safeParse(updatedBy).success ? updatedBy : null;

  const payload = {
    label: parsed.label,
    value: parsed.value,
    note: parsed.note,
    sort_order: parsed.sortOrder,
    updated_by: safeUpdatedBy,
    updated_at: new Date().toISOString()
  };

  const query = parsed.id
    ? admin.from("telegram_support_methods").upsert({ id: parsed.id, ...payload }, { onConflict: "id" })
    : admin.from("telegram_support_methods").insert(payload);

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTelegramSupportMethod(methodId: string) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("telegram_support_methods").delete().eq("id", methodId);

  if (error) {
    throw new Error(error.message);
  }
}

export type { TelegramSupportMethod, TelegramSupportSettings };
