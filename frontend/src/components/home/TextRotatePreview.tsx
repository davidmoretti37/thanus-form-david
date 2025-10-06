"use client";

import React from "react";
import { LayoutGroup, motion } from "motion/react";
import { TextRotate } from "@/components/ui/text-rotate";

function TextRotatePreview() {
  return (
    <div className="w-full text-2xl sm:text-3xl md:text-5xl flex flex-row items-center justify-center font-light overflow-hidden p-6 sm:p-10 md:p-12">
      <LayoutGroup>
        <motion.p className="flex whitespace-pre" layout>
          <motion.span
            className="pt-0.5 sm:pt-1 md:pt-2"
            layout
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
          >
            {"Integre com "}
          </motion.span>
          <TextRotate
            texts={[
              "Monday",
              "Clickup",
              "Notion",
              "Gmail",
              "3K Ferramentas",
              "AI First",
            ]}
            mainClassName="text-white px-2 sm:px-2 md:px-3 bg-[#3B82F6] overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
            staggerFrom={"last"}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-120%" }}
            staggerDuration={0.025}
            splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            rotationInterval={4000}
          />
        </motion.p>
      </LayoutGroup>
    </div>
  );
}

export default TextRotatePreview;
