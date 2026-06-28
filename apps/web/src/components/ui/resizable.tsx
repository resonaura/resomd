import * as React from 'react';
import * as ResizablePrimitive from 'react-resizable-panels';
import { GripVerticalIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const ResizablePanelGroup = React.forwardRef<
  ResizablePrimitive.GroupImperativeHandle,
  ResizablePrimitive.GroupProps
>(({ className, ...props }, ref) => (
  <ResizablePrimitive.Group
    groupRef={ref}
    data-slot="resizable-panel-group"
    className={cn(
      'flex h-full w-full aria-[orientation=vertical]:flex-col',
      className
    )}
    {...props}
  />
));
ResizablePanelGroup.displayName = 'ResizablePanelGroup';

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.PanelImperativeHandle,
  ResizablePrimitive.PanelProps
>(({ ...props }, ref) => {
  const Panel = ResizablePrimitive.Panel as React.ComponentType<
    ResizablePrimitive.PanelProps &
      React.RefAttributes<ResizablePrimitive.PanelImperativeHandle>
  >;
  return <Panel ref={ref} data-slot="resizable-panel" {...props} />;
});
ResizablePanel.displayName = 'ResizablePanel';

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        'bg-border ring-offset-background focus-visible:ring-ring relative flex w-px cursor-col-resize items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-2.5 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-2.5 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=vertical]:cursor-row-resize',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex size-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
