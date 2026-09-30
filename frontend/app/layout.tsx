export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'sans-serif', margin: 0, padding: '2rem' }}>
        {children}
      </body>
    </html>
  );
}