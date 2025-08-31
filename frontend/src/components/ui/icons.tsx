/**
 * Icons Component
 * Centralized icon exports
 */

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileText,
  Folder,
  Github,
  HelpCircle,
  Home,
  Info,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sun,
  Trash,
  Upload,
  User,
  UserPlus,
  Users,
  X,
  Zap,
  Gem,
  BookOpen,
  Brain,
  Clock,
  type LucideIcon,
} from 'lucide-react';

export type Icon = LucideIcon;

export const Icons = {
  alertCircle: AlertCircle,
  alertTriangle: AlertTriangle,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  circle: Circle,
  copy: Copy,
  download: Download,
  edit: Edit,
  externalLink: ExternalLink,
  eye: Eye,
  eyeOff: EyeOff,
  file: File,
  fileText: FileText,
  folder: Folder,
  github: Github,
  helpCircle: HelpCircle,
  home: Home,
  info: Info,
  loader: Loader2,
  lock: Lock,
  login: LogIn,
  logout: LogOut,
  mail: Mail,
  menu: Menu,
  messageSquare: MessageSquare,
  moon: Moon,
  moreHorizontal: MoreHorizontal,
  moreVertical: MoreVertical,
  plus: Plus,
  refresh: RefreshCw,
  search: Search,
  send: Send,
  settings: Settings,
  shield: Shield,
  spinner: Loader2,
  sun: Sun,
  trash: Trash,
  upload: Upload,
  user: User,
  userPlus: UserPlus,
  users: Users,
  x: X,
  zap: Zap,
  gem: Gem,
  bookOpen: BookOpen,
  brain: Brain,
  clock: Clock,
  
  // Custom Google icon
  google: (props: any) => (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z" />
    </svg>
  ),
};