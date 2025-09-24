"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MiniCalendar from "@/components/ui/mini-calendar";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  User,
  Filter,
  ArrowUpDown,
  EyeOff,
  LayoutGrid,
  MoreHorizontal,
  ChevronDown,
  Copy,
  Upload,
  Archive,
  Trash2,
  Shuffle,
  ArrowRight,
  Sparkles,
  Puzzle,
  X,
} from "lucide-react";

type Priority = "Alta" | "Média" | "Baixa";
type Periodicity = "Pontual" | "Espontânea" | "Atípica";

type Contributor = {
  name: string;
  email: string;
  avatar: string;
  role: string;
};

type Project = {
  id: string;
  title: string;
  team: string;
  priority: Priority;
  periodicity: Periodicity;
  timeline: string; // e.g. "-" or "22 - 23 mai"
  status: "Active" | "Inactive" | "In Progress";
  contributors: Contributor[];
};

const initialData: Project[] = [
  {
    id: "1",
    title: "Planejar Sprint UI",
    team: "UI Guild",
    priority: "Alta",
    periodicity: "Pontual",
    timeline: "-",
    status: "Active",
    contributors: [
      {
        name: "Srinath G",
        email: "srinath@example.com",
        avatar: "https://github.com/srinath.png",
        role: "UI Lead",
      },
      {
        name: "Kavya M",
        email: "kavya@example.com",
        avatar: "https://github.com/kavya.png",
        role: "Designer",
      },
    ],
  },
  {
    id: "2",
    title: "Definir Guidelines RUX",
    team: "Component Devs",
    priority: "Alta",
    periodicity: "Espontânea",
    timeline: "-",
    status: "In Progress",
    contributors: [
      {
        name: "Arjun R",
        email: "arjun@example.com",
        avatar: "https://github.com/arjun.png",
        role: "Developer",
      },
      {
        name: "Divya S",
        email: "divya@example.com",
        avatar: "https://github.com/divya.png",
        role: "QA",
      },
    ],
  },
  {
    id: "3",
    title: "Manutenção Backoffice",
    team: "CV Core",
    priority: "Média",
    periodicity: "Pontual",
    timeline: "-",
    status: "Active",
    contributors: [
      {
        name: "Manoj T",
        email: "manoj@example.com",
        avatar: "https://github.com/manoj.png",
        role: "Backend Lead",
      },
    ],
  },
  {
    id: "4",
    title: "Campanha Docs",
    team: "Tech Writers",
    priority: "Alta",
    periodicity: "Atípica",
    timeline: "22 - 23 mai",
    status: "Active",
    contributors: [
      {
        name: "Sneha R",
        email: "sneha@example.com",
        avatar: "https://github.com/sneha.png",
        role: "Documentation",
      },
      {
        name: "Vinay K",
        email: "vinay@example.com",
        avatar: "https://github.com/vinay.png",
        role: "Maintainer",
      },
    ],
  },
  {
    id: "5",
    title: "Relatório Analytics",
    team: "Data Squad",
    priority: "Alta",
    periodicity: "Pontual",
    timeline: "-",
    status: "Active",
    contributors: [
      {
        name: "Aarav N",
        email: "aarav@example.com",
        avatar: "https://github.com/aarav.png",
        role: "Data Engineer",
      },
    ],
  },
];

const allColumns = [
  "Project",
  "Team",
  "Prioridade",
  "Periodicidade",
  "Timeline",
  "Contributors",
  "Status",
] as const;

function PriorityBadge({ value }: { value: Priority }) {
  // Alta = pink, Média = dark blue, Baixa = gray
  const classes =
    value === "Alta"
      ? "bg-pink-600 text-white"
      : value === "Média"
      ? "bg-blue-900 text-white"
      : "bg-gray-400 text-white";
  return (
    <Badge className={cn("rounded-md px-3 py-1 font-medium", classes)}>
      {value}
    </Badge>
  );
}

function PeriodicityBadge({ value }: { value: Periodicity }) {
  // Pontual = blue, Espontânea = coral, Atípica = purple
  const classes =
    value === "Pontual"
      ? "bg-blue-600 text-white"
      : value === "Espontânea"
      ? "bg-rose-400 text-white"
      : "bg-purple-400 text-white";
  return (
    <Badge className={cn("rounded-md px-3 py-1 font-medium", classes)}>
      {value}
    </Badge>
  );
}

function TimelinePill({ value }: { value: string }) {
  const hasValue = value && value !== "-";
  const classes = hasValue
    ? "bg-blue-600 text-white"
    : "bg-muted text-foreground/60";
  return (
    <div
      className={cn(
        "inline-flex h-8 min-w-[110px] items-center justify-center rounded-full px-3 text-sm",
        classes
      )}
    >
      {hasValue ? value : "-"}
    </div>
  );
}

function formatTimelineRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return "-";
  const fmtShort = (d: Date) => {
    const day = d.getDate();
    const month = d.toLocaleString("pt-BR", { month: "short" });
    const year = d.getFullYear() % 100;
    return `${day} ${month}, ’${String(year).padStart(2, "0")}`;
  };
  if (start && end) {
    const sameMonth =
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      const day1 = start.getDate();
      const day2 = end.getDate();
      const month = start.toLocaleString("pt-BR", { month: "short" });
      return `${day1} - ${day2} ${month}`;
    }
    return `${fmtShort(start)} - ${fmtShort(end)}`;
  }
  const d = (start || end)!;
  return fmtShort(d);
}

function DateRangePopup({
  onApply,
  initialStart = null,
  initialEnd = null,
}: {
  onApply: (text: string) => void;
  initialStart?: Date | null;
  initialEnd?: Date | null;
}) {
  const [target, setTarget] = useState<"start" | "end">("start");
  const [start, setStart] = useState<Date | null>(initialStart);
  const [end, setEnd] = useState<Date | null>(initialEnd);
  const value = target === "start" ? start ?? undefined : end ?? undefined;

  const handlePick = (d: Date) => {
    if (target === "start") {
      if (end && d > end) {
        setStart(end);
        setEnd(d);
        setTarget("end");
      } else {
        setStart(d);
        setTarget("end");
      }
    } else {
      if (start && d < start) {
        setEnd(start);
        setStart(d);
      } else {
        setEnd(d);
      }
    }
  };

  return (
    <div className="w-[300px]">
      <div className="text-sm font-medium mb-2">Definir datas</div>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setTarget("start")}
          className={cn(
            "h-8 px-3 rounded-md border text-xs",
            target === "start"
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          )}
        >
          Data de início
        </button>
        <button
          onClick={() => setTarget("end")}
          className={cn(
            "h-8 px-3 rounded-md border text-xs",
            target === "end"
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          )}
        >
          Data de término
        </button>
      </div>
      <MiniCalendar value={value as any} onChange={handlePick} />
      <div className="flex justify-between items-center mt-3">
        <button
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => {
            setStart(null);
            setEnd(null);
          }}
        >
          Limpar
        </button>
        <Button size="sm" onClick={() => onApply(formatTimelineRange(start, end))}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}

/* Editor de texto inline com salvamento instantâneo */
/* Pickers de Timeline com controle de abertura para fechar ao aplicar */
function TimelinePickerPill({
  value,
  onApply,
}: {
  value: string;
  onApply: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className="cursor-pointer inline-block">
          <TimelinePill value={value} />
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="p-3 w-auto border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-xl"
      >
        <DateRangePopup
          onApply={(text) => {
            onApply(text);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function TimelinePickerButton({
  value,
  onApply,
}: {
  value: string;
  onApply: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-9 min-w-[110px] items-center justify-center rounded-full px-3 text-sm bg-muted text-foreground/60 hover:bg-muted/80"
          type="button"
        >
          {value || "-"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="p-3 w-auto border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-xl"
      >
        <DateRangePopup
          onApply={(text) => {
            onApply(text);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/* Editor de texto inline com salvamento instantâneo */
function InlineTextEdit({
  value,
  onChange,
  placeholder,
  className,
  initialEditing,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  initialEditing?: boolean;
}) {
  const [editing, setEditing] = useState<boolean>(initialEditing ?? false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const val = inputRef.current.value;
      inputRef.current.setSelectionRange(val.length, val.length);
    }
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "text-left w-full rounded-md px-2 h-8 flex items-center hover:bg-muted/70",
          className
        )}
      >
        {value?.trim() ? value : <span className="text-muted-foreground">{placeholder ?? "Clique para editar"}</span>}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      className={cn("h-8 w-full rounded-md border bg-background px-2 text-sm", className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function ContributorsTable() {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    [...allColumns]
  );
  const [searchText, setSearchText] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [statusSet, setStatusSet] = useState<Set<Project["status"]>>(new Set());
  const [prioritySet, setPrioritySet] = useState<Set<Priority>>(new Set());
  const [periodicitySet, setPeriodicitySet] = useState<Set<Periodicity>>(new Set());
  const [sortBy, setSortBy] = useState<{ field: "title" | "priority" | "timeline" | "none"; dir: "asc" | "desc" }>({ field: "none", dir: "asc" });
  const [groupBy, setGroupBy] = useState<"none" | "priority" | "periodicity" | "status">("none");
  const [rows, setRows] = useState<Project[]>(initialData);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState<{
    title: string;
    team: string;
    contributorsText: string;
    priority: Priority;
    periodicity: Periodicity;
    timeline: string;
    status: Project["status"];
  }>({
    title: "",
    team: "",
    contributorsText: "",
    priority: "Alta",
    periodicity: "Pontual",
    timeline: "-",
    status: "Active",
  });

  // Autosave: carregar do localStorage no mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("taskshumanRows");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRows(parsed as Project[]);
        }
      }
    } catch (e) {
      console.warn("Falha ao carregar taskshumanRows", e);
    }
  }, []);

  // Autosave: salvar alterações (debounce 300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem("taskshumanRows", JSON.stringify(rows));
      } catch (e) {
        console.warn("Falha ao salvar taskshumanRows", e);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [rows]);

  const uniqueContributors = Array.from(
    new Set(
      rows.flatMap((p) => p.contributors.map((c) => c.name)).filter(Boolean)
    )
  );

  const priorityOrder: Record<Priority, number> = { Alta: 0, "Média": 1, Baixa: 2 };

  const filteredData = rows
    .filter((project) => {
      const matchesSearch =
        searchText.trim().length === 0 ||
        [project.title, project.team]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(searchText.toLowerCase()));

      const matchesPerson =
        !personFilter ||
        project.contributors.some((c) => c.name === personFilter);

      const matchesStatus =
        statusSet.size === 0 || statusSet.has(project.status);

      const matchesPriority =
        prioritySet.size === 0 || prioritySet.has(project.priority);

      const matchesPeriodicity =
        periodicitySet.size === 0 || periodicitySet.has(project.periodicity);

      return (
        matchesSearch &&
        matchesPerson &&
        matchesStatus &&
        matchesPriority &&
        matchesPeriodicity
      );
    })
    .sort((a, b) => {
      if (sortBy.field === "none") return 0;
      if (sortBy.field === "title") {
        return sortBy.dir === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      if (sortBy.field === "priority") {
        return sortBy.dir === "asc"
          ? priorityOrder[a.priority] - priorityOrder[b.priority]
          : priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      if (sortBy.field === "timeline") {
        return sortBy.dir === "asc"
          ? a.timeline.localeCompare(b.timeline)
          : b.timeline.localeCompare(a.timeline);
      }
      return 0;
    });

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  // Helpers para criar novas tasks
  const blankRow = (): Project => ({
    id: String(Date.now()),
    title: "",
    team: "",
    priority: "Alta",
    periodicity: "Pontual",
    timeline: "-",
    status: "Active",
    contributors: [],
  });
  // Adiciona no topo (para o botão da toolbar)
  const addNewRow = () => {
    setRows((prev) => [blankRow(), ...prev]);
  };
  // Adiciona no final (para o botão de "+ Adicionar elemento" no rodapé)
  const addNewRowBottom = () => {
    setRows((prev) => [...prev, blankRow()]);
  };

  // Seleção em massa - ações
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulk = (action: string) => {
    const ids = Array.from(selectedIds);
    // Ações exemplo - extensível
    if (action === "delete") {
      setRows((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      clearSelection();
      return;
    }
    if (action === "duplicate") {
      setRows((prev) => {
        const extras = prev
          .filter((p) => selectedIds.has(p.id))
          .map((p) => ({ ...p, id: String(Date.now() + Math.random()), title: `${p.title} (cópia)` }));
        return [...prev, ...extras];
      });
      return;
    }
    // Outras ações podem ser integradas aqui (export, move, convert, apps...)
    console.log("[bulk]", action, ids);
  };

  return (
    <div className="container my-10 space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-600/90 text-white">
                Criar elemento <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={addNewRow}>Linha vazia</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Search className="h-4 w-4" /> Pesquisar
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <Input
                autoFocus
                placeholder="Pesquisar por título ou equipe..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" /> Pessoa
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={() => setPersonFilter(null)}>
                Todos
              </DropdownMenuItem>
              {uniqueContributors.map((name) => (
                <DropdownMenuCheckboxItem
                  key={name}
                  checked={personFilter === name}
                  onCheckedChange={() =>
                    setPersonFilter((prev) => (prev === name ? null : name))
                  }
                >
                  {name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Filtro
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Prioridade
              </div>
              {(["Alta","Média","Baixa"] as Priority[]).map((p) => (
                <DropdownMenuCheckboxItem
                  key={p}
                  checked={prioritySet.has(p)}
                  onCheckedChange={() =>
                    setPrioritySet((prev) => {
                      const ns = new Set(prev);
                      ns.has(p) ? ns.delete(p) : ns.add(p);
                      return ns;
                    })
                  }
                >
                  {p}
                </DropdownMenuCheckboxItem>
              ))}
              <div className="px-2 pt-2 text-xs font-medium text-muted-foreground">
                Periodicidade
              </div>
              {(["Pontual","Espontânea","Atípica"] as Periodicity[]).map((per) => (
                <DropdownMenuCheckboxItem
                  key={per}
                  checked={periodicitySet.has(per)}
                  onCheckedChange={() =>
                    setPeriodicitySet((prev) => {
                      const ns = new Set(prev);
                      ns.has(per) ? ns.delete(per) : ns.add(per);
                      return ns;
                    })
                  }
                >
                  {per}
                </DropdownMenuCheckboxItem>
              ))}
              <div className="px-2 pt-2 text-xs font-medium text-muted-foreground">
                Status
              </div>
              {(["Active","Inactive","In Progress"] as Project["status"][]).map((st) => (
                <DropdownMenuCheckboxItem
                  key={st}
                  checked={statusSet.has(st)}
                  onCheckedChange={() =>
                    setStatusSet((prev) => {
                      const ns = new Set(prev);
                      ns.has(st) ? ns.delete(st) : ns.add(st);
                      return ns;
                    })
                  }
                >
                  {st}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" /> Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={() => setSortBy({ field: "none", dir: "asc" })}>Sem ordenação (original)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy({ field: "title", dir: "asc" })}>Título (A→Z)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy({ field: "title", dir: "desc" })}>Título (Z→A)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy({ field: "priority", dir: "asc" })}>Prioridade (Alta→Baixa)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy({ field: "priority", dir: "desc" })}>Prioridade (Baixa→Alta)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy({ field: "timeline", dir: "asc" })}>Timeline (A→Z)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy({ field: "timeline", dir: "desc" })}>Timeline (Z→A)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <EyeOff className="h-4 w-4" /> Ocultar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {allColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleColumns.includes(col)}
                  onCheckedChange={() => toggleColumn(col)}
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <LayoutGrid className="h-4 w-4" /> Agrupar por
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem onClick={() => setGroupBy("none")}>Nenhum</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("priority")}>Prioridade</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("periodicity")}>Periodicidade</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("status")}>Status</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setSearchText(""); setPersonFilter(null); setStatusSet(new Set()); setPrioritySet(new Set()); setPeriodicitySet(new Set()); }}>
                Limpar filtros
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setVisibleColumns([...allColumns]); setGroupBy("none"); }}>
                Resetar layout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[36px]"></TableHead>
            {visibleColumns.includes("Project") && (
              <TableHead className="w-[220px]">Project</TableHead>
            )}
            {visibleColumns.includes("Team") && (
              <TableHead className="w-[160px]">Team</TableHead>
            )}
            {visibleColumns.includes("Prioridade") && (
              <TableHead className="w-[140px]">Prioridade</TableHead>
            )}
            {visibleColumns.includes("Periodicidade") && (
              <TableHead className="w-[160px]">Periodicidade</TableHead>
            )}
            {visibleColumns.includes("Timeline") && (
              <TableHead className="w-[160px]">Timeline</TableHead>
            )}
            {visibleColumns.includes("Contributors") && (
              <TableHead className="w-[180px]">Contributors</TableHead>
            )}
            {visibleColumns.includes("Status") && (
              <TableHead className="w-[120px]">Status</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAdding && (
            <TableRow>
              {visibleColumns.includes("Project") && (
                <TableCell>
                  <Input
                    placeholder="Título da task"
                    value={newRow.title}
                    onChange={(e) =>
                      setNewRow((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </TableCell>
              )}
              {visibleColumns.includes("Team") && (
                <TableCell>
                  <Input
                    placeholder="Equipe"
                    value={newRow.team}
                    onChange={(e) =>
                      setNewRow((p) => ({ ...p, team: e.target.value }))
                    }
                  />
                </TableCell>
              )}
              {visibleColumns.includes("Prioridade") && (
                <TableCell>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={newRow.priority}
                    onChange={(e) =>
                      setNewRow((p) => ({ ...p, priority: e.target.value as Priority }))
                    }
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </TableCell>
              )}
              {visibleColumns.includes("Periodicidade") && (
                <TableCell>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={newRow.periodicity}
                    onChange={(e) =>
                      setNewRow((p) => ({
                        ...p,
                        periodicity: e.target.value as Periodicity,
                      }))
                    }
                  >
                    <option value="Pontual">Pontual</option>
                    <option value="Espontânea">Espontânea</option>
                    <option value="Atípica">Atípica</option>
                  </select>
                </TableCell>
              )}
              {visibleColumns.includes("Timeline") && (
                <TableCell>
                  <TimelinePickerButton
                    value={newRow.timeline}
                    onApply={(text) => {
                      setNewRow((p) => ({ ...p, timeline: text }));
                    }}
                  />
                </TableCell>
              )}
              {visibleColumns.includes("Contributors") && (
                <TableCell>
                  <Input
                    placeholder="Contribuidores (nomes separados por vírgula)"
                    value={newRow.contributorsText}
                    onChange={(e) =>
                      setNewRow((p) => ({
                        ...p,
                        contributorsText: e.target.value,
                      }))
                    }
                  />
                </TableCell>
              )}
              {visibleColumns.includes("Status") && (
                <TableCell className="space-y-2">
                  <select
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={newRow.status}
                    onChange={(e) =>
                      setNewRow((p) => ({
                        ...p,
                        status: e.target.value as Project["status"],
                      }))
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!newRow.title.trim()) return;
                        const contributors = newRow.contributorsText
                          .split(",")
                          .map((n) => n.trim())
                          .filter(Boolean)
                          .map((name) => ({
                            name,
                            email: "",
                            avatar: "",
                            role: "Contributor",
                          }));
                        const project: Project = {
                          id: String(Date.now()),
                          title: newRow.title.trim() || "Untitled",
                          team: newRow.team.trim() || "",
                          priority: newRow.priority,
                          periodicity: newRow.periodicity,
                          timeline: newRow.timeline.trim() || "-",
                          status: newRow.status,
                          contributors,
                        };
                        setRows((prev) => [project, ...prev]);
                        setIsAdding(false);
                        setNewRow({
                          title: "",
                          team: "",
                          contributorsText: "",
                          priority: "Alta",
                          periodicity: "Pontual",
                          timeline: "-",
                          status: "Active",
                        });
                      }}
                    >
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAdding(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          )}

          {filteredData.length ? (
            filteredData.map((project) => (
              <TableRow key={project.id} className="group">
                <TableCell className="w-[36px]">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(project.id)}
                    onChange={() =>
                      setSelectedIds((prev) => {
                        const ns = new Set(prev);
                        ns.has(project.id) ? ns.delete(project.id) : ns.add(project.id);
                        return ns;
                      })
                    }
                    className={cn(
                      "h-4 w-4 rounded border transition",
                      selectedIds.has(project.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    aria-label="Selecionar item"
                  />
                </TableCell>
                {visibleColumns.includes("Project") && (
                  <TableCell className="font-medium whitespace-nowrap">
                    <InlineTextEdit
                      value={project.title}
                      placeholder="Sem título"
                      initialEditing={project.title === ""}
                      onChange={(val) =>
                        setRows((prev) =>
                          prev.map((p) =>
                            p.id === project.id ? { ...p, title: val } : p
                          )
                        )
                      }
                    />
                  </TableCell>
                )}
                {visibleColumns.includes("Team") && (
                  <TableCell className="whitespace-nowrap">
                    <InlineTextEdit
                      value={project.team}
                      placeholder="Equipe"
                      onChange={(val) =>
                        setRows((prev) =>
                          prev.map((p) =>
                            p.id === project.id ? { ...p, team: val } : p
                          )
                        )
                      }
                    />
                  </TableCell>
                )}
                {visibleColumns.includes("Prioridade") && (
                  <TableCell className="whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-md px-1 py-0.5">
                          <PriorityBadge value={project.priority} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(["Alta","Média","Baixa"] as Priority[]).map((opt) => (
                          <DropdownMenuCheckboxItem
                            key={opt}
                            checked={project.priority === opt}
                            onCheckedChange={() =>
                              setRows((prev) =>
                                prev.map((p) =>
                                  p.id === project.id ? { ...p, priority: opt } : p
                                )
                              )
                            }
                          >
                            {opt}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
                {visibleColumns.includes("Periodicidade") && (
                  <TableCell className="whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-md px-1 py-0.5">
                          <PeriodicityBadge value={project.periodicity} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(["Pontual","Espontânea","Atípica"] as Periodicity[]).map((opt) => (
                          <DropdownMenuCheckboxItem
                            key={opt}
                            checked={project.periodicity === opt}
                            onCheckedChange={() =>
                              setRows((prev) =>
                                prev.map((p) =>
                                  p.id === project.id ? { ...p, periodicity: opt } : p
                                )
                              )
                            }
                          >
                            {opt}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
                {visibleColumns.includes("Timeline") && (
                  <TableCell className="whitespace-nowrap">
                    <TimelinePickerPill
                      value={project.timeline}
                      onApply={(text) => {
                        setRows((prev) =>
                          prev.map((p) =>
                            p.id === project.id ? { ...p, timeline: text } : p
                          )
                        );
                      }}
                    />
                  </TableCell>
                )}
                {visibleColumns.includes("Contributors") && (
                  <TableCell className="min-w-[140px]">
                    <div className="flex -space-x-2">
                      <TooltipProvider>
                        {project.contributors.map((contributor, idx) => (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8 ring-2 ring-white hover:z-10">
                                <AvatarImage
                                  src={contributor.avatar}
                                  alt={contributor.name}
                                />
                                <AvatarFallback>
                                  {contributor.name[0]}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent className="text-sm">
                              <p className="font-semibold">
                                {contributor.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {contributor.email}
                              </p>
                              <p className="text-xs italic">
                                {contributor.role}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes("Status") && (
                  <TableCell className="whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-md px-1 py-0.5">
                          <Badge
                            className={cn(
                              "whitespace-nowrap",
                              project.status === "Active" &&
                                "bg-green-500 text-white",
                              project.status === "Inactive" &&
                                "bg-gray-400 text-white",
                              project.status === "In Progress" &&
                                "bg-yellow-500 text-white"
                            )}
                          >
                            {project.status}
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(["Active","Inactive","In Progress"] as Project["status"][]).map((opt) => (
                          <DropdownMenuCheckboxItem
                            key={opt}
                            checked={project.status === opt}
                            onCheckedChange={() =>
                              setRows((prev) =>
                                prev.map((p) =>
                                  p.id === project.id ? { ...p, status: opt } : p
                                )
                              )
                            }
                          >
                            {opt}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={visibleColumns.length}
                className="text-center py-6"
              >
                No results found.
              </TableCell>
            </TableRow>
          )}
          {/* Linha para adicionar novo item, estilo Monday/ClickUp */}
        </TableBody>
      </Table>

      <div className="mt-2">
        <button
          type="button"
          onClick={addNewRowBottom}
          className="w-full text-left text-sm text-muted-foreground hover:text-foreground px-2 py-2 rounded-md hover:bg-muted/50"
        >
          + Adicionar elemento
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-50">
          <div
            className={cn(
              "flex items-center gap-6 px-5 py-3 rounded-2xl border shadow-xl",
              "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
              "ring-1 ring-black/5 dark:ring-white/10"
            )}
          >
            <div className="text-xs text-muted-foreground mr-2">
              {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
            </div>

            <button className="flex items-center gap-2 text-sm hover:opacity-80" onClick={() => handleBulk("duplicate")}>
              <Copy className="h-5 w-5" /> Duplicar
            </button>
            <button className="flex items-center gap-2 text-sm hover:opacity-80" onClick={() => handleBulk("export")}>
              <Upload className="h-5 w-5" /> Exportar
            </button>
            <button className="flex items-center gap-2 text-sm hover:opacity-80" onClick={() => handleBulk("archive")}>
              <Archive className="h-5 w-5" /> Arquivar
            </button>
            <button className="flex items-center gap-2 text-sm text-red-600 hover:opacity-80" onClick={() => handleBulk("delete")}>
              <Trash2 className="h-5 w-5" /> Excluir
            </button>
            <button className="flex items-center gap-2 text-sm hover:opacity-80" onClick={() => handleBulk("convert")}>
              <Shuffle className="h-5 w-5" /> Converter
            </button>
            <button className="flex items-center gap-2 text-sm hover:opacity-80" onClick={() => handleBulk("move")}>
              <ArrowRight className="h-5 w-5" /> Mover
            </button>
            <button className="flex items-center gap-2 text-sm hover:opacity-80" onClick={() => handleBulk("sidekick")}>
              <Sparkles className="h-5 w-5" /> Sidekick
            </button>
            <button className="flex items-center gap-2 text-sm hover:opacity-80" onClick={() => handleBulk("apps")}>
              <Puzzle className="h-5 w-5" /> Apps
            </button>

            <div className="mx-1 h-6 w-px bg-border" />

            <button
              className="flex items-center gap-2 text-sm hover:opacity-80"
              onClick={clearSelection}
              aria-label="Fechar"
              title="Limpar seleção"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContributorsTable;
