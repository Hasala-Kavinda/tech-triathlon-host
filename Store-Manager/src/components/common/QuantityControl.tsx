import {  Minus, Plus  } from 'lucide-react';
import {  AnimatePresence, motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  IconButton  } from './Button';

export function QuantityControl({
      value,
      onChange,
      disabled = false,
    }: {
          value: number
          onChange: (value: number) => void
          disabled?: boolean
        }) {
    return (
    <div
      className={`quantity-control ${
        disabled ? "quantity-control--disabled" : ""
      }`}
    >
      <IconButton
        label="Decrease quantity"
        onClick={() => !disabled && onChange(Math.max(0, value - 1))}
      >
        <Minus />
      </IconButton>
      <span className="quantity-value">{value}</span>
      <IconButton
        label="Increase quantity"
        onClick={() => !disabled && onChange(value + 1)}
      >
        <Plus />
      </IconButton>
    </div>
    )
}

export function DirectQuantityControl({
      quantity,
      onChange,
      max,
    }: {
          quantity: number
          onChange: (quantity: number) => void
          max?: number
        }) {
    const [value, setValue] = useState(String(quantity));
    const [error, setError] = useState("");
    useEffect(() => setValue(String(quantity)), [quantity])

    function updateDirectValue(nextValue: string) {
        setValue(nextValue)
        if (nextValue === "") {
          setError("")
          return
        }

        if (!/^\d+$/.test(nextValue)) {
          setError("Enter a whole number of 0 or more.")
          return
        }

        if (max !== undefined && Number(nextValue) > max) {
          setError(`Quantity cannot exceed ${max}.`)
          return
        }

        setError("")
        onChange(Number(nextValue))
    }

    function normalizeValue() {
        if (value === "" || error) {
          setValue(String(quantity))
          setError("")
        }
    }

    return (
    <div className="direct-quantity-wrap">
      <div
        className={`quantity-control direct-quantity ${
          error ? "direct-quantity--error" : ""
        }`}
      >
        <IconButton
          label="Decrease quantity"
          onClick={() => onChange(Math.max(0, quantity - 1))}
        >
          <Minus />
        </IconButton>
        <input
          aria-label="Quantity"
          inputMode="numeric"
          value={value}
          onBlur={normalizeValue}
          onChange={(event) => updateDirectValue(event.target.value)}
        />
        <IconButton
          label="Increase quantity"
          onClick={() =>
            onChange(
              max === undefined ? quantity + 1 : Math.min(max, quantity + 1),
            )
          }
        >
          <Plus />
        </IconButton>
      </div>
      <AnimatePresence>
        {error && (
          <motion.small
            className="quantity-error"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
          >
            {error}
          </motion.small>
        )}
      </AnimatePresence>
    </div>
    )
}
