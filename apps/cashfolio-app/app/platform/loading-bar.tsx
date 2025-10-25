import { AnimatePresence, motion } from "motion/react";
import { useFetchers, useNavigation } from "react-router";
import { useDebouncedValue } from "./debounce";

const ANIMATION_DEBOUNCE_IN_MS = 100;

export function LoadingBar() {
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const isNavigating = navigation.state !== "idle" || fetchers.length > 0;
  const isDebouncedNavigating = useDebouncedValue(
    isNavigating,
    ANIMATION_DEBOUNCE_IN_MS,
  );

  return (
    <AnimatePresence>
      {isNavigating && isDebouncedNavigating && (
        <motion.div
          className="fixed top-0 right-0 left-0 z-50 h-[3px] animate-pulse rounded-r-full bg-brand-500 dark:bg-brand-400"
          initial={{ width: "0%" }}
          animate={{ width: "80%" }}
          transition={{ duration: 2, ease: "easeOut" }}
          exit={{
            width: "100%",
            transition: {
              duration: 0.4,
              ease: "easeIn",
            },
          }}
        />
      )}
    </AnimatePresence>
  );
}
