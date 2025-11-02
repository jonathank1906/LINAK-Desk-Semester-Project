import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
export function AccordionLogin() {
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>What is Sevanta?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Sevanta is a desk booking and workspace management
            platform designed to help companies optimize their
            office space and improve employee experience.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How do I get access?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            If your company is already using Sevanta but you
            do not have your own login, please contact your
            administrator who can invite you.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}