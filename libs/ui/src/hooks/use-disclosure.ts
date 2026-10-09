import { useCallback, useState } from 'react';

export function useDisclosure(initialOpen = false) {
  const [isOpen, setOpen] = useState(initialOpen);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(value => !value), []);
  return { isOpen, open, close, toggle };
}
