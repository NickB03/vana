import GalleryHoverCarousel from "@/components/ui/gallery-hover-carousel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GalleryDemo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-4 text-foreground">Gallery Hover Carousel Demo</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          An interactive gallery carousel with hover effects and smooth transitions.
          Hover over each card to see the full description and navigate using the arrow buttons or drag to scroll.
        </p>
      </div>

      <GalleryHoverCarousel
        heading="Featured AI Capabilities"
        items={[
          {
            id: "item-1",
            title: "Build Modern UIs",
            summary: "Create stunning user interfaces with our comprehensive design system powered by React and Tailwind CSS.",
            url: "#",
            image: "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/dashboard-02.png",
          },
          {
            id: "item-2",
            title: "Computer Vision Technology",
            summary: "Powerful image recognition and processing capabilities that allow AI systems to analyze, understand, and interpret visual information from the world.",
            url: "#",
            image: "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/dashboard-gradient.png",
          },
          {
            id: "item-3",
            title: "Machine Learning Automation",
            summary: "Self-improving algorithms that learn from data patterns to automate complex tasks and make intelligent decisions with minimal human intervention.",
            url: "#",
            image: "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/featured-01.png",
          },
          {
            id: "item-4",
            title: "Predictive Analytics",
            summary: "Advanced forecasting capabilities that analyze historical data to predict future trends and outcomes, helping businesses make data-driven decisions.",
            url: "#",
            image: "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/featured-06.png",
          },
          {
            id: "item-5",
            title: "Neural Network Architecture",
            summary: "Sophisticated AI models inspired by human brain structure, capable of solving complex problems through deep learning and pattern recognition.",
            url: "#",
            image: "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/Screenshot%202025-08-05%20at%2021-15-55%20Ruixen%20-%20Beautifully%20crafted%20UI%20components%20to%20elevate%20your%20web%20projects.png",
          },
          {
            id: "item-6",
            title: "Real-time Data Processing",
            summary: "Process and analyze streaming data in real-time to enable instant insights and rapid decision-making for time-sensitive applications.",
            url: "#",
            image: "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/dashboard-02.png",
          }
        ]}
      />

      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Component Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2 text-foreground">Hover Interaction</h3>
              <p className="text-sm text-muted-foreground">
                Cards expand on hover to reveal full descriptions and call-to-action buttons with smooth transitions.
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2 text-foreground">Framer Motion</h3>
              <p className="text-sm text-muted-foreground">
                Built with Framer Motion for smooth, physics-based animations and drag-to-scroll functionality.
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2 text-foreground">Responsive Design</h3>
              <p className="text-sm text-muted-foreground">
                Fully responsive with optimized layouts for mobile, tablet, and desktop viewports.
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2 text-foreground">Theme Support</h3>
              <p className="text-sm text-muted-foreground">
                Seamlessly integrates with your app's theme system, supporting both light and dark modes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
