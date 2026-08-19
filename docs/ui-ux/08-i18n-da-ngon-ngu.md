# UX-08. Kiến trúc i18n ba ngôn ngữ

## 1. Mục tiêu

Frontend CMS hỗ trợ đầy đủ ba locale:

| Locale kỹ thuật | Nhãn trong giao diện | Vai trò |
|---|---|---|
| `vi` | VI | Mặc định và fallback cuối |
| `en` | EN | English |
| `ja` | 日本語 | Japanese |

Toàn bộ nội dung do ứng dụng sở hữu phải đi qua i18n. Không để chuỗi người dùng nhìn thấy trực tiếp trong component, hook hoặc service frontend. Quy tắc này bao gồm tiêu đề, label, placeholder, accessible name, tooltip, trạng thái, validation, empty/error/loading state, thông báo và metadata.

Tên riêng, mã hồ sơ, nội dung email, ghi chú và dữ liệu do người dùng hoặc backend cung cấp không được tự động dịch. Các enum, trạng thái và nhãn hệ thống phải dùng mã ổn định rồi được dịch ở frontend.

## 2. Quyết định kiến trúc

CMS không thêm prefix locale vào URL. `/candidates`, `/applications` và các deep link hiện tại giữ nguyên để saved view, bookmark và liên kết nghiệp vụ không bị thay đổi.

Ngôn ngữ là tùy chọn cá nhân:

1. `RootLayout` đọc cookie `cms_locale`.
2. Giá trị hợp lệ được truyền vào `I18nProvider` và dùng cho `<html lang>` ngay từ lần render đầu.
3. Nếu cookie thiếu hoặc sai, hệ thống dùng `vi`.
4. Khi người dùng đổi ngôn ngữ, provider cập nhật state, cookie và thuộc tính `lang` mà không điều hướng sang URL khác.
5. Cookie không chứa PII và dùng `SameSite=Lax`, `Path=/`, thời hạn một năm.

Không dùng cờ quốc gia làm biểu tượng ngôn ngữ. Bộ chọn hiển thị chữ `VI`, `EN`, `日本語`.

## 3. Cấu trúc mã nguồn

```text
apps/web/src/i18n/
├── config.ts             # Locale hợp lệ, cookie, fallback
├── types.ts              # Message tree và tham số dịch
├── provider.tsx          # Context và persistence
├── use-i18n.ts           # t, formatDate, formatNumber
├── translate.ts          # Lookup, interpolation, plural, fallback
├── domain-labels.ts      # Enum/status/catalog hệ thống
└── locales/
    ├── vi.ts
    ├── en.ts
    └── ja.ts
```

Dictionary được chia namespace theo ranh giới nghiệp vụ:

- `common`, `auth`, `navigation`, `validation`;
- `work`, `clients`, `orders`, `candidates`, `applications`;
- `journeys`, `mailbox`, `reports`, `admin`.

`vi` là cây key chuẩn. `en` và `ja` phải `satisfies` cùng một `DeepMessageShape`, vì vậy thiếu hoặc thừa key sẽ làm typecheck thất bại. Component chỉ gọi key; không import trực tiếp một locale cụ thể.

Ví dụ API:

```tsx
const { t, formatDateTime } = useI18n();

return (
  <Button aria-label={t('common.actions.close')}>
    {t('common.actions.save')}
  </Button>
);
```

`t` hỗ trợ tham số đặt tên và số nhiều bằng `Intl.PluralRules`; không nối các mảnh câu đã dịch. Thiếu key ở locale hiện tại fallback về `vi` trong production và tạo lỗi rõ ràng trong test/development.

## 4. Định dạng theo locale

Không gọi trực tiếp `toLocaleDateString('vi-VN')`, `toLocaleString('vi-VN')` hoặc tự ghép đơn vị trong component.

Provider cung cấp:

- `formatDate`, `formatDateTime`, `formatTime` bằng `Intl.DateTimeFormat`;
- `formatNumber`, `formatPercent` bằng `Intl.NumberFormat`;
- `formatRelative` cho thời gian tương đối nếu màn hình cần;
- `t` với plural rule cho người, tệp, đơn, thư và vòng phỏng vấn.

Mapping locale:

| Locale ứng dụng | Locale Intl |
|---|---|
| `vi` | `vi-VN` |
| `en` | `en-US` |
| `ja` | `ja-JP` |

Timezone nghiệp vụ vẫn được hiển thị rõ và không suy ra từ ngôn ngữ. Dữ liệu lịch phỏng vấn hoặc lộ trình dùng timezone của bản ghi; ngôn ngữ chỉ ảnh hưởng cách trình bày.

### Typography theo locale

`Be Vietnam Pro` tiếp tục dùng cho `vi` và `en`. Locale `ja` phải nạp font có đầy đủ glyph Nhật, ưu tiên `Noto Sans JP`, và áp dụng bằng selector theo thuộc tính `lang`. Không dựa vào system fallback vì sẽ làm trọng lượng chữ, chiều cao dòng và độ rộng control khác nhau giữa máy Windows và máy chủ kiểm thử.

Font Nhật chỉ nạp các weight đang dùng trong CMS. Browser QA phải kiểm tra heading, table, form và modal bằng nội dung Nhật dài; không chấp nhận tofu glyph hoặc trộn nhiều font trong cùng một câu.

## 5. Dữ liệu nghiệp vụ và nội dung email

Các giá trị như `RECRUITING`, `WAITING_INTERVIEW`, `ACTIVE`, `BLOCKED` được giữ dưới dạng code và ánh xạ qua `domain-labels.ts`. Không lưu nhãn tiếng Việt làm nguồn sự thật của trạng thái.

Danh mục do quản trị viên tạo là dữ liệu nghiệp vụ, không tự động dịch. Danh mục hệ thống có mã chuẩn và ba nhãn locale. Dữ liệu mock phải mô phỏng cùng hợp đồng này thay vì trả về nhãn hệ thống cố định bằng tiếng Việt.

Nội dung email ứng viên không lấy từ dictionary UI. Email template có phiên bản và locale riêng; nội dung đã gửi/nhận luôn hiển thị nguyên văn để giữ audit. Các nút, trạng thái gửi, validation và mô tả xung quanh chuỗi email vẫn dùng i18n UI.

API không trả câu lỗi tiếng Việt làm hợp đồng cho UI. Lỗi nghiệp vụ dùng `errorCode` ổn định và tham số có cấu trúc; frontend ánh xạ mã sang key trong namespace `validation` hoặc feature tương ứng. Mã chưa biết hiển thị lỗi chung theo locale và support reference, không hiển thị thẳng thông báo kỹ thuật từ server.

Ba dictionary phải tuân theo glossary nghiệp vụ chung cho `Candidate`, `Application`, `Job Order`, `Supply Journey`, `Milestone`, `Client` và `Mailbox`. Bản tiếng Nhật dùng thuật ngữ tuyển dụng/cung ứng nhân sự nhất quán; không để bản dịch máy chưa rà soát trong bản bàn giao.

## 6. Bộ chọn ngôn ngữ

Bộ chọn ngôn ngữ xuất hiện tại:

- topbar của CMS sau đăng nhập;
- trang đăng nhập và các màn hình lỗi phiên.

Control dùng select hoặc menu chữ, có label dịch được, điều khiển được bằng bàn phím và không phụ thuộc icon. Trên mobile, control giữ hit area tối thiểu nhưng không đẩy tìm kiếm, thông báo hoặc đăng xuất ra ngoài viewport.

Khi đổi locale:

- nội dung hiện tại đổi ngay, không reload;
- focus ở lại control;
- URL, filter, drawer/modal và dữ liệu form đang nhập không bị mất;
- ngày, số và plural được render lại theo locale mới.

## 7. Migration

Migration thực hiện theo ranh giới để diff kiểm soát được, nhưng một bản bàn giao không được để giao diện trộn ngôn ngữ:

1. Tạo core i18n, dictionary parity test và provider tại root.
2. Chuyển shell, auth và shared UI.
3. Chuyển từng feature cùng formatter và domain labels.
4. Chuyển metadata, lỗi API và trạng thái nền.
5. Bổ sung bộ chọn locale, responsive QA và hard-text gate.

`constants/navigation.ts` chỉ giữ route, permission và translation key; label được resolve trong render theo locale hiện tại.

## 8. Quality gate chống hard text

Thêm checker dựa trên TypeScript AST, chạy trong lint/CI, để phát hiện chuỗi giao diện tại:

- JSX text node;
- `aria-label`, `title`, `placeholder`, `alt` và nội dung button/option;
- thông báo validation, toast, loading, empty và error do frontend tạo.

Checker bỏ qua có chủ đích:

- dictionary locale;
- test và snapshot;
- mock/fixture chứa tên riêng hoặc nội dung người dùng;
- class name, route, permission, enum code, query key, form `name`, test id và giá trị kỹ thuật;
- ký hiệu trung tính như `—`, mã `N1`–`N5`, email và identifier.

Các ngoại lệ khác phải khai báo theo file và có lý do; không tắt checker cho toàn thư mục feature.

## 9. Kiểm thử

TDD áp dụng cho từng lớp:

- RED: parity ba dictionary, fallback, interpolation và plural chưa tồn tại;
- GREEN: core translator và provider;
- RED/GREEN: cookie persistence, `<html lang>` và language switch;
- RED/GREEN: shell và mỗi feature render key mẫu bằng `en` và `ja`;
- regression: locale mặc định `vi` giữ nguyên toàn bộ hành vi hiện tại;
- hard-text checker phải trả về zero violation cho production frontend;
- lint, typecheck, unit test và production build phải đạt;
- browser QA ở desktop và 320 px cho cả ba locale, không tràn ngang và không có console error.

## 10. Tiêu chí hoàn thành

- `vi`, `en`, `ja` có cùng tập key và không còn placeholder dịch.
- Bản dịch English/Japanese tuân theo glossary nghiệp vụ; font Nhật hiển thị đầy đủ glyph và weight.
- Không còn chuỗi giao diện do ứng dụng sở hữu nằm ngoài dictionary.
- Không còn locale `vi-VN` hard-code trong feature component.
- Chuyển ngôn ngữ không reload và không làm mất state màn hình.
- Enum/trạng thái hệ thống hiển thị đúng ở cả ba locale.
- Dữ liệu người dùng và lịch sử email không bị dịch sai hoặc thay đổi nội dung.
- Checker hard text, toàn bộ test và production build đều đạt.
