import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const PaymentReference = ({
  reference,
  className = "",
  copyable = true,
}: {
  reference: string;
  className?: string;
  copyable?: boolean;
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(reference);
    toast.success("Payment reference copied");
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <code className="font-mono font-semibold text-primary text-sm px-2.5 py-1.5 bg-primary/5 rounded-md border border-primary/20">
        {reference}
      </code>
      {copyable && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleCopy}
          title="Copy payment reference"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};
