// Per-icon public imports keep the unused catalog out of the web bundle.
import { HouseIcon } from '@animateicons/react/lucide/house-icon';
import { CalendarDaysIcon } from '@animateicons/react/lucide/calendar-days-icon';
import { ClockIcon } from '@animateicons/react/lucide/clock-icon';
import { BookOpenIcon } from '@animateicons/react/lucide/book-open-icon';
import { MessageCircleIcon } from '@animateicons/react/lucide/message-circle-icon';
import { CheckIcon } from '@animateicons/react/lucide/check-icon';
import { CircleCheckIcon } from '@animateicons/react/lucide/circle-check-icon';
import { CircleQuestionMarkIcon } from '@animateicons/react/lucide/circle-question-mark-icon';
import { CircleMinusIcon } from '@animateicons/react/lucide/circle-minus-icon';
import { CircleDashedIcon } from '@animateicons/react/lucide/circle-dashed-icon';
import { PlusIcon } from '@animateicons/react/lucide/plus-icon';
import { PencilIcon } from '@animateicons/react/lucide/pencil-icon';
import { Trash2Icon } from '@animateicons/react/lucide/trash-2-icon';
import { SettingsIcon } from '@animateicons/react/lucide/settings-icon';
import { BellIcon } from '@animateicons/react/lucide/bell-icon';
import { ArrowLeftIcon } from '@animateicons/react/lucide/arrow-left-icon';
import { ChevronRightIcon } from '@animateicons/react/lucide/chevron-right-icon';
import { ChevronLeftIcon } from '@animateicons/react/lucide/chevron-left-icon';
import { DownloadIcon } from '@animateicons/react/lucide/download-icon';
import { UploadIcon } from '@animateicons/react/lucide/upload-icon';
import { InfoIcon } from '@animateicons/react/lucide/info-icon';
import { CircleAlertIcon } from '@animateicons/react/lucide/circle-alert-icon';
import { XIcon } from '@animateicons/react/lucide/x-icon';
import { PillIcon } from '@animateicons/react/lucide/pill-icon';
import type { IconName } from './catalog.js';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { IconHandle } from './props.js';

interface WebGlyphProps {
  size?: number;
  duration?: number;
  isAnimated?: boolean;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export const webGlyphs: Record<IconName, ForwardRefExoticComponent<WebGlyphProps & RefAttributes<IconHandle>>> = {
  home: HouseIcon, calendar: CalendarDaysIcon, clock: ClockIcon, journal: BookOpenIcon,
  chat: MessageCircleIcon, check: CheckIcon, taken: CircleCheckIcon, unsure: CircleQuestionMarkIcon,
  missed: CircleMinusIcon, 'no-entry': CircleDashedIcon, plus: PlusIcon, edit: PencilIcon,
  delete: Trash2Icon, settings: SettingsIcon, reminder: BellIcon, back: ArrowLeftIcon,
  next: ChevronRightIcon, previous: ChevronLeftIcon, download: DownloadIcon, upload: UploadIcon,
  info: InfoIcon, warning: CircleAlertIcon, close: XIcon, pill: PillIcon,
};
