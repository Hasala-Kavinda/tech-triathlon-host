import { AlertTriangle } from "lucide-react";
import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  Button  } from '../common/Button';
import { calmSpring } from "../../lib/constants";

export function SubmissionError({
      onRetry,
      onBack,
    }: {
          onRetry: () => void
          onBack: () => void
        }) {
    return (
    <motion.div
      className="submission-error"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={calmSpring}
    >
      <span className="submission-error-icon">
        <AlertTriangle />
      </span>
      <div>
        <strong>We couldn’t submit this order.</strong>
        <p>Your selections are still saved.</p>
      </div>
      <div className="submission-error-actions">
        <Button onClick={onRetry}>Try again</Button>
        <Button tone="secondary" onClick={onBack}>
          Back to edit
        </Button>
      </div>
    </motion.div>
    )
}
