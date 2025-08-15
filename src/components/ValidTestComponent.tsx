import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ValidTestComponentProps {
  title: string;
  onClick: () => void;
}

export default function ValidTestComponent({ title, onClick }: ValidTestComponentProps) {
  return (
    <Card data-testid="valid-test-component" className="p-4">
      <Button 
        onClick={onClick} 
        aria-label="Test action button"
        data-testid="test-button"
        className="w-full"
      >
        {title}
      </Button>
    </Card>
  );
}