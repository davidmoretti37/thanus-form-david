"use client";

import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";
import AnimatedGradientDemo from "@/components/home/AnimatedGradientDemo";
import TextRotatePreview from "@/components/home/TextRotatePreview";

export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden pb-[200px] pt-[80px]">
      <TextRotatePreview />
      <ContainerScroll
        titleComponent={null}
      >
        <Image
          src="/images/Home.jpg"
          alt="hero"
          height={720}
          width={1400}
          className="mx-auto rounded-2xl object-cover h-full object-left-top"
          draggable={false}
          priority
        />
      </ContainerScroll>
      <div className="mt-12">
        <AnimatedGradientDemo />
      </div>
    </div>
  );
}

export default HeroScrollDemo;
