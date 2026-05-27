import "./globals.css";

export const metadata = {
  title: "ระบบจัดการครุภัณฑ์และตรวจสอบราคามาตรฐาน - สำนักงบประมาณ 2568",
  description: "ระบบจัดการครุภัณฑ์และตรวจสอบราคามาตรฐานกองมาตรฐานงบประมาณ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
