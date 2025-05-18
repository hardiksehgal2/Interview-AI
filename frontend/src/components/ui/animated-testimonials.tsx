"use client";

import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src: string;
};

export const AnimatedTestimonials = ({
  testimonials,
  autoplay = false,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) => {
  const [active, setActive] = useState(0);

  const handleNext = () =>
    setActive((prev) => (prev + 1) % testimonials.length);
  const handlePrev = () =>
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  const isActive = (idx: number) => idx === active;

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(handleNext, 5_000);
    return () => clearInterval(id);
  }, [autoplay]);

  // simple helper to vary the “fanned-out” rotation of the cards
  const randomRotateY = () => Math.floor(Math.random() * 21) - 10;

  /* ----------  JSX  ---------- */
  return (
    <div className="mx-auto max-w-sm px-4 py-20 font-sans antialiased md:max-w-md">
      <div className="flex flex-col items-center text-center space-y-8">
        {/* ----------  IMAGE STACK  ---------- */}
        <div className="relative h-80 w-full">
          <AnimatePresence>
            {testimonials.map((t, idx) => (
              <motion.div
                key={t.src}
                initial={{
                  opacity: 0,
                  scale: 0.9,
                  z: -100,
                  rotate: randomRotateY(),
                }}
                animate={{
                  opacity: isActive(idx) ? 1 : 0.7,
                  scale: isActive(idx) ? 1 : 0.95,
                  z: isActive(idx) ? 0 : -100,
                  rotate: isActive(idx) ? 0 : randomRotateY(),
                  zIndex: isActive(idx) ? 40 : testimonials.length + 2 - idx,
                  y: isActive(idx) ? [0, -80, 0] : 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  z: 100,
                  rotate: randomRotateY(),
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute inset-0 origin-bottom"
              >
                <img
                  src={t.src}
                  alt={t.name}
                  draggable={false}
                  className="h-full w-full rounded-3xl object-cover object-center"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ----------  NAME / TITLE / QUOTE  ---------- */}
        <motion.div
          key={active}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="space-y-4"
        >
          <div>
            <h3 className="text-2xl font-bold text-black dark:text-white">
              {testimonials[active].name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-neutral-800">
              {testimonials[active].designation}
            </p>
          </div>

          <motion.p className="text-lg text-gray-600 dark:text-neutral-300">
            {testimonials[active].quote.split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
                animate={{ filter: "blur(0)", opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                  delay: i * 0.022,
                }}
                className="inline-block"
              >
                {word}&nbsp;
              </motion.span>
            ))}
          </motion.p>
        </motion.div>

        {/* ----------  NAV BUTTONS  ---------- */}
        <div className="flex gap-4">
          <button
            onClick={handlePrev}
            className="group flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800"
          >
            <IconArrowLeft
              className="h-5 w-5 text-black dark:text-neutral-400 transition-transform duration-300 group-hover:-translate-x-1"
            />
          </button>
          <button
            onClick={handleNext}
            className="group flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800"
          >
            <IconArrowRight
              className="h-5 w-5 text-black dark:text-neutral-400 transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </div>
      </div>
    </div>
  );
};
