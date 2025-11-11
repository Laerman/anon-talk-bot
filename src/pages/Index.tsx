export default function Index() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto px-4 py-12">
        <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
          <iframe
            src="https://vk.com/video_ext.php?oid=-203677279&id=456242093&hd=2"
            frameBorder="0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}