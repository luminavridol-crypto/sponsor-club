import { format } from "date-fns";

export function formatDate(date: string | Date) {
  return format(new Date(date), "dd.MM.yyyy HH:mm");
}
