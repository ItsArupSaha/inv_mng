import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';

interface PackagePaymentSectionProps {
  customers: Customer[];
  customerCredit: number;
}

export function PackagePaymentSection({
  customers,
  customerCredit,
}: PackagePaymentSectionProps) {
  const { control, watch } = useFormContext();
  const watchDiscountType = watch('discountType');
  const watchPaymentMethod = watch('paymentMethod');

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectPortal>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
              {customerCredit > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  Customer has ৳{customerCredit.toFixed(2)} credit available.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Sale Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
              <FormLabel>Manual Discount</FormLabel>
          </div>
          <div className="flex gap-2">
            <FormField
              control={control}
              name="discountType"
              render={({ field }) => (
                <FormItem className="w-1/3">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectPortal>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="amount">৳</SelectItem>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="discountValue"
              render={({ field }) => (
                <FormItem className={cn("w-2/3", watchDiscountType === 'none' && 'opacity-50 pointer-events-none')}>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Payment Method</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-wrap gap-4"
                >
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><RadioGroupItem value="Cash" id="cash-pkg" /></FormControl>
                    <FormLabel htmlFor="cash-pkg" className="font-normal cursor-pointer">Cash</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><RadioGroupItem value="Bank" id="bank-pkg" /></FormControl>
                    <FormLabel htmlFor="bank-pkg" className="font-normal cursor-pointer">Bank</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><RadioGroupItem value="Due" id="due-pkg" /></FormControl>
                    <FormLabel htmlFor="due-pkg" className="font-normal cursor-pointer">Due</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><RadioGroupItem value="Split" id="split-pkg" /></FormControl>
                    <FormLabel htmlFor="split-pkg" className="font-normal cursor-pointer">Split</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {watchPaymentMethod === 'Split' && (
        <div className='flex gap-4 items-end bg-accent/20 p-4 rounded-md border'>
          <FormField
            control={control}
            name="amountPaid"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Amount Paid Now</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Enter amount paid" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="splitPaymentMethod"
            render={({ field }) => (
              <FormItem className="flex-1 space-y-3">
                <FormLabel>Paid Via</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex gap-4"
                  >
                    <FormItem className="flex items-center space-x-2">
                      <FormControl><RadioGroupItem value="Cash" id="split-cash-pkg" /></FormControl>
                      <FormLabel htmlFor="split-cash-pkg" className="font-normal cursor-pointer">Cash</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2">
                      <FormControl><RadioGroupItem value="Bank" id="split-bank-pkg" /></FormControl>
                      <FormLabel htmlFor="split-bank-pkg" className="font-normal cursor-pointer">Bank</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </>
  );
}
