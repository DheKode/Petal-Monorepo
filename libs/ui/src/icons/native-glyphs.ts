import House from 'lucide-react-native/icons/house';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Clock from 'lucide-react-native/icons/clock';
import BookOpen from 'lucide-react-native/icons/book-open';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Check from 'lucide-react-native/icons/check';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleQuestionMark from 'lucide-react-native/icons/circle-question-mark';
import CircleMinus from 'lucide-react-native/icons/circle-minus';
import CircleDashed from 'lucide-react-native/icons/circle-dashed';
import Plus from 'lucide-react-native/icons/plus';
import Pencil from 'lucide-react-native/icons/pencil';
import Trash from 'lucide-react-native/icons/trash';
import Settings from 'lucide-react-native/icons/settings';
import Bell from 'lucide-react-native/icons/bell';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Download from 'lucide-react-native/icons/download';
import Upload from 'lucide-react-native/icons/upload';
import Info from 'lucide-react-native/icons/info';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import X from 'lucide-react-native/icons/x';
import Pill from 'lucide-react-native/icons/pill';
import type { IconName } from './catalog.js';
import type { LucideIcon } from 'lucide-react-native';

// NodeNext treats upstream per-icon .d.ts files as CommonJS namespaces, but the
// package's import condition returns ESM forwardRef components. Contract tests
// render every real export through mocked SVG hosts to verify this boundary.

export const nativeGlyphs = ({
  home: House, calendar: CalendarDays, clock: Clock, journal: BookOpen,
  chat: MessageCircle, check: Check, taken: CircleCheck, unsure: CircleQuestionMark,
  missed: CircleMinus, 'no-entry': CircleDashed, plus: Plus, edit: Pencil,
  delete: Trash, settings: Settings, reminder: Bell, back: ArrowLeft,
  next: ChevronRight, previous: ChevronLeft, download: Download, upload: Upload,
  info: Info, warning: CircleAlert, close: X, pill: Pill,
} satisfies Record<IconName, unknown>) as unknown as Record<IconName, LucideIcon>;
