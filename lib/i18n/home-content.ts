import type { Locale } from "@/lib/i18n/config";

const content = {
  en: {
    inside: [
      ["Private photos", "Shots that never reach the public feed"],
      ["Behind the scenes", "Lighting, looks, creative work and the moments before the final shot"],
      ["More personal video", "Short clips, voice, movement and a closer sense of presence"],
      ["Pole diary", "Training, progress and everything that happens off camera"],
      ["Cosplay process", "From the first idea and makeup to the finished look"],
      ["Early access", "New releases before they appear on public social media"],
      ["Personal stories", "Mood, romance, darkness, femininity and the little details"],
      ["Lumina after dark", "A more private atmosphere for the club's highest levels"]
    ],
    faq: [
      ["How do I get access?", "Choose a membership level, open the Telegram app and send your request. Access opens once it is approved."],
      ["Where can I view the content?", "Members-only content and updates are available inside the club's Telegram app."],
      ["Can I upgrade later?", "Yes. You can move to a higher level whenever you want more content and a closer experience."]
    ]
  },
  vi: {
    inside: [
      ["Ảnh riêng", "Những khung hình không xuất hiện trên trang công khai"],
      ["Hậu trường buổi chụp", "Ánh sáng, concept, quá trình chuẩn bị và những khoảnh khắc trước khi có ảnh hoàn chỉnh"],
      ["Video gần gũi hơn", "Những đoạn video ngắn, giọng nói, chuyển động và cảm giác chân thật hơn"],
      ["Nhật ký pole", "Quá trình tập luyện, tiến bộ và những điều diễn ra ngoài khung hình"],
      ["Quá trình làm cosplay", "Từ ý tưởng, phụ kiện và makeup đến concept hoàn chỉnh"],
      ["Xem sớm", "Xem nội dung mới trước khi được đăng trên mạng xã hội"],
      ["Những câu chuyện riêng", "Cảm xúc, sự lãng mạn, nét bí ẩn, nữ tính và những chi tiết nhỏ"],
      ["Góc tối của Lumina", "Không gian riêng tư hơn dành cho các gói thành viên cao nhất"]
    ],
    faq: [
      ["Làm sao để mở quyền truy cập?", "Chọn gói thành viên, mở ứng dụng Telegram rồi gửi yêu cầu. Quyền truy cập sẽ được mở sau khi xác nhận."],
      ["Xem nội dung ở đâu?", "Nội dung riêng và các cập nhật mới nằm trong ứng dụng Telegram của club."],
      ["Có thể nâng cấp sau không?", "Có. Bạn có thể nâng cấp bất cứ lúc nào khi muốn xem thêm nội dung và đến gần Lumina hơn."]
    ]
  }
} as const;

export function getLocalizedHomeCollections(locale: Locale) {
  if (locale === "ru") return null;
  return content[locale];
}
