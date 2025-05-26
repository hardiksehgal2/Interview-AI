"use client"
// components/AnimatedTestimonials.client.tsx
// src/components/AnimatedTestimonials.client.tsx
export { AnimatedTestimonials } from "@/components/ui/animated-testimonials";


// wherever you use it
import dynamic from "next/dynamic";

const AnimatedTestimonials = dynamic(
  () => import("@/components/ui/animated-testimonials").then(m => m.AnimatedTestimonials),
  { ssr: false }
);

export function AnimatedTestimonialsDemo() {
    const testimonials = [
      {
        quote:
          "The platform's intuitive design and powerful features have greatly improved our workflow. It's exactly what we needed.",
        name: "Priyank Sharma",
        designation: "Product Manager at JustHired",
        src: "https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?q=80&w=3006&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        quote:
          "Seamless integration and exceptional results! The platform is remarkably flexible and adaptable.",
        name: "Sneha Patel",
        designation: "CTO at JustHired",
        src: "https://plus.unsplash.com/premium_photo-1681074963522-00ca908dce4e?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        quote:
          "Our team's productivity has increased significantly. The interface is user-friendly, simplifying complex tasks.",
        name: "Arjun Verma",
        designation: "Operations Director at JustHired",
        src: "https://images.unsplash.com/photo-1623582854588-d60de57fa33f?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        quote:
          "Excellent support and robust features. It's rare to find a product that truly lives up to its promises.",
        name: "Meera Krishnan",
        designation: "Engineering Lead at JustHired",
        src: "https://plus.unsplash.com/premium_photo-1661777437775-97a30fc4baa0?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        quote:
          "The scalability and performance are game-changing. Highly recommended for any business looking to grow.",
        name: "John Thompson",
        designation: "VP of Technology at JustHired",
        src: "https://images.unsplash.com/photo-1624561172888-ac93c696e10c?q=80&w=2592&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
    ];
  
    return <AnimatedTestimonials testimonials={testimonials} />;
  
}
