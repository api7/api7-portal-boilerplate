"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

export type BackupCodesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  backupCodes: string[]
  onClose?: () => void
}

export function BackupCodesDialog({
  open,
  onOpenChange,
  backupCodes,
  onClose
}: BackupCodesDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    onOpenChange(false)
    onClose?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Backup Codes</DialogTitle>
          <DialogDescription>
            Save these backup codes in a safe place. You can use them to access
            your account if you lose your authenticator device.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code, index) => (
            <div
              key={index}
              className="rounded-md bg-muted p-2 text-center font-mono text-sm"
            >
              {code}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            disabled={copied}
          >
            {copied ? (
              <>
                <CheckIcon />
                Copied
              </>
            ) : (
              <>
                <CopyIcon />
                Copy All
              </>
            )}
          </Button>

          <Button type="button" onClick={handleClose}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
