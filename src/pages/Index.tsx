export default function Index() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto px-4 py-12">
        <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
          <iframe
            src="https://rutube.ru/play/embed/5a2366b054a5bf2de8d3e80a33e286b8"
            frameBorder="0"
            allow="clipboard-write; autoplay"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
