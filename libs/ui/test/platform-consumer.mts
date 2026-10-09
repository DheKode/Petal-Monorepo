import { Button, TextField, ConfirmDialog, type ButtonProps } from '@petal/ui/components';
import { Button as NativeButton, TextField as NativeField, ConfirmDialog as NativeDialog } from '@petal/ui/components/native';
import { useDisclosure, useReducedMotion } from '@petal/ui/hooks';
import { useReducedMotion as nativeMotion } from '@petal/ui/hooks/native';
import { Screen, Stack } from '@petal/ui/layouts';
import { Screen as NativeScreen } from '@petal/ui/layouts/native';
import { classNames, resolveLayout } from '@petal/ui/utils';
import { Icon, IconButton, type IconProps, type IconButtonProps } from '@petal/ui/icons';
import { Icon as NativeIcon, IconButton as NativeIconButton } from '@petal/ui/icons/native';

const sharedAction: ButtonProps = { label: 'Review change', onPress() {} };
// @ts-expect-error Every action needs an explicit readable label.
const unlabeled: ButtonProps = { onPress() {} };
// @ts-expect-error Appearance names must come from the shared variants.
const invalid: ButtonProps = { label: 'Save', variant: 'protected' };
void [Button, TextField, ConfirmDialog, NativeButton, NativeField, NativeDialog, useDisclosure,
  useReducedMotion, nativeMotion, Screen, Stack, NativeScreen, classNames, resolveLayout, sharedAction, unlabeled, invalid];

const namedIcon: IconProps = { name: 'calendar', decorative: false, label: 'Schedule', size: 'large' };
// @ts-expect-error A meaningful standalone icon must have a label.
const missingIconLabel: IconProps = { name: 'calendar', decorative: false };
// @ts-expect-error An icon-only action must have a label.
const missingButtonLabel: IconButtonProps = { name: 'calendar' };
// @ts-expect-error Arbitrary pixels must not bypass shared icon sizing.
const arbitraryIconSize: IconProps = { name: 'calendar', size: 31 };
void [Icon, IconButton, NativeIcon, NativeIconButton, namedIcon, missingIconLabel, missingButtonLabel, arbitraryIconSize];
