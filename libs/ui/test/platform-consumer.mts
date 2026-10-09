import { Button, TextField, ConfirmDialog, type ButtonProps } from '@petal/ui/components';
import { Button as NativeButton, TextField as NativeField, ConfirmDialog as NativeDialog } from '@petal/ui/components/native';
import { useDisclosure, useReducedMotion } from '@petal/ui/hooks';
import { useReducedMotion as nativeMotion } from '@petal/ui/hooks/native';
import { Screen, Stack } from '@petal/ui/layouts';
import { Screen as NativeScreen } from '@petal/ui/layouts/native';
import { classNames, resolveLayout } from '@petal/ui/utils';

const sharedAction: ButtonProps = { label: 'Review change', onPress() {} };
// @ts-expect-error Every action needs an explicit readable label.
const unlabeled: ButtonProps = { onPress() {} };
// @ts-expect-error Appearance names must come from the shared variants.
const invalid: ButtonProps = { label: 'Save', variant: 'protected' };
void [Button, TextField, ConfirmDialog, NativeButton, NativeField, NativeDialog, useDisclosure,
  useReducedMotion, nativeMotion, Screen, Stack, NativeScreen, classNames, resolveLayout, sharedAction, unlabeled, invalid];
