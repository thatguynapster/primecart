'use client'

import React, { useState } from 'react'
import CustomModal from '../global/custom-modal';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Loader from '../global/loader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Copy } from 'lucide-react';

type Props = { link: string }

const PaymentLinkModal = ({ link }: Props) => {

    const [open, setOpen] = useState(false)
    const [getPaymentLink, setGetPaymentLink] = useState(false)

    return (
        <CustomModal title="Payment Link" className="w-full max-w-96">
            <div className="flex gap-4 items-center truncate">
                {getPaymentLink ?
                    <div className="flex justify-center w-full">
                        <Loader className="w-16 h-16" />
                    </div>
                    :
                    <>
                        <Link href={link} target="_blank" className="truncate">{link}</Link>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu open={open} onOpenChange={setOpen}>
                                        <DropdownMenuTrigger
                                            className="px-4 py-2 border-2 rounded-lg flex gap-2 items-center"
                                            aria-label="Share payment link"
                                        >
                                            <Copy className="cursor-pointer" size={20} />
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent className="!mb-2">
                                            <DropdownMenuItem
                                                className="capitalize cursor-pointer"
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    // _updateOrderStatus(order_id, status);
                                                }}
                                            >
                                                Send via Email
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                className="capitalize cursor-pointer"
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    // _updateOrderStatus(order_id, status);
                                                }}
                                            >
                                                Send via Whatsapp
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p onClick={async () => { await navigator.clipboard.writeText(link) }}>Copy link to clipboard</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </>
                }
            </div>
        </CustomModal>
    )
}

export default PaymentLinkModal