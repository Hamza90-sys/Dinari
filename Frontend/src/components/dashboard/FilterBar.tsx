import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Filter, ChevronDown } from "lucide-react";

export type FilterValue = {
  statuses: string[];
  services: string[];
};

const STATUS_OPTIONS = ["Awaiting Payment", "Processing", "Completed", "Failed"];
const SERVICE_OPTIONS = ["ChatGPT", "Netflix", "Spotify", "Disney+", "Apple TV"];

export const FilterBar = ({
  value,
  onChange,
  className,
}: {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  className?: string;
}) => {
  const toggle = (key: keyof FilterValue, item: string) => {
    const list = value[key];
    onChange({
      ...value,
      [key]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item],
    });
  };

  const total = value.statuses.length + value.services.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-full text-xs">
            <Filter className="h-3.5 w-3.5" />
            Status
            {value.statuses.length > 0 && (
              <span className="ml-1 rounded-full bg-primary-soft px-1.5 text-[10px] font-semibold text-primary">
                {value.statuses.length}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((s) => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={value.statuses.includes(s)}
              onCheckedChange={() => toggle("statuses", s)}
            >
              {s}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-full text-xs">
            <Filter className="h-3.5 w-3.5" />
            Service
            {value.services.length > 0 && (
              <span className="ml-1 rounded-full bg-primary-soft px-1.5 text-[10px] font-semibold text-primary">
                {value.services.length}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by service</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SERVICE_OPTIONS.map((s) => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={value.services.includes(s)}
              onCheckedChange={() => toggle("services", s)}
            >
              {s}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {total > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange({ statuses: [], services: [] })}
        >
          Clear all
        </Button>
      )}
    </div>
  );
};
