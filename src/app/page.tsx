'use client'

import React, { useEffect, useRef, useState } from 'react'
import Lenis from '@studio-freight/lenis'
import { gsap as gsapCore } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import s from './page.module.css'

gsapCore.registerPlugin(ScrollTrigger)

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  
  // Custom Cursor & Flashlight Refs
  const cursorDotRef = useRef<HTMLDivElement>(null)
  const cursorRingRef = useRef<HTMLDivElement>(null)
  const flashlightRef = useRef<HTMLDivElement>(null)
  
  // Hero Bottle 3D Engine Refs
  const heroRef = useRef<HTMLDivElement>(null)
  const bottleWrapperRef = useRef<HTMLDivElement>(null)
  const bottleGlowRef = useRef<HTMLDivElement>(null)
  const bottleBodyRef = useRef<HTMLDivElement>(null)
  const bottleGlintRef = useRef<HTMLDivElement>(null)
  const bottleLiquidSloshRef = useRef<HTMLDivElement>(null)
  const phantomRef = useRef<HTMLDivElement>(null)
  
  // Badges Refs for Magnetic Pull
  const badge1Ref = useRef<HTMLDivElement>(null)
  const badge2Ref = useRef<HTMLDivElement>(null)
  const badge3Ref = useRef<HTMLDivElement>(null)

  // Horizontal Scroll Refs
  const pulseSectionRef = useRef<HTMLDivElement>(null)
  const pulseContainerRef = useRef<HTMLDivElement>(null)
  
  // State variables for physics
  const mouse = useRef({ x: 0, y: 0 })
  const delayedMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Preloader sequence
    const duration = 2200
    const start = Date.now()
    const intv = setInterval(() => {
      const elapsed = Date.now() - start
      const p = Math.min((elapsed / duration) * 100, 100)
      setProgress(p)
      if (p === 100) {
        clearInterval(intv)
        setTimeout(() => setLoading(false), 300)
      }
    }, 16)
    return () => clearInterval(intv)
  }, [])

  // --- GSAP High-End Interactions ---
  useGSAP(() => {
    // 3D BOTTLE ENGINE: Scroll-driven rotation and scaling
    if (bottleWrapperRef.current && heroRef.current) {
      gsapCore.to(bottleWrapperRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5, // Smooth scrub
        },
        rotationY: -15, // Rotate on Y axis ±15deg
        scale: 1.1, // Scale depth
        z: 100, // Move closer in 3D space
        ease: "none"
      })
      
      // Secondary Glint layer parallax (faster translation)
      if (bottleGlintRef.current) {
        gsapCore.to(bottleGlintRef.current, {
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
          y: 150,
          rotation: -8,
          ease: "none"
        })
      }
    }

    // LIQUID SHIMMER PHYSICS: Slosh effect
    // We attach a ScrollTrigger to the document that maps scrolling velocity to Y translation
    const sloshProxy = { y: 0 }
    ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: "max",
      onUpdate: (self) => {
        // self.getVelocity() gets pixel/second velocity of scroll
        const velocity = Math.min(Math.max(self.getVelocity() / 50, -20), 20) 
        
        // Push the liquid pseudoelement in the opposite direction of scroll
        if (bottleLiquidSloshRef.current) {
           gsapCore.to(sloshProxy, {
             y: velocity,
             duration: 0.6,
             ease: "power3.out",
             onUpdate: () => {
               if (bottleLiquidSloshRef.current) {
                   // We actually just target the liquid container and slide it slightly
                   gsapCore.set(bottleLiquidSloshRef.current, { y: sloshProxy.y })
               }
             }
           })
        }
      }
    })

    // HORIZONTAL SCROLL SECTIONS: PULSE section pinning
    if (pulseSectionRef.current && pulseContainerRef.current) {
      gsapCore.utils.toArray(pulseContainerRef.current.children)
      
      gsapCore.to(pulseContainerRef.current, {
        x: () => -(pulseContainerRef.current!.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: pulseSectionRef.current,
          start: "top top",
          end: () => `+=${pulseContainerRef.current!.scrollWidth - window.innerWidth}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        }
      })
    }

  }, { scope: undefined })

  useEffect(() => {
    // PHYSICS SCROLLING: lenis lerp 0.05, duration 1.5s
    const lenis = new Lenis({
      duration: 1.5,
      lerp: 0.05, // Buttery smooth heavy scroll
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    })

    // Integrate Lenis with ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    gsapCore.ticker.add((time) => {
      lenis.raf(time * 1000)
    })
    gsapCore.ticker.lagSmoothing(0)

    // Scroll progress bar + Nav Blur
    const scrollBar = document.getElementById('scroll-progress')
    lenis.on('scroll', (e: { progress: number, animatedScroll: number }) => {
      if (scrollBar) {
        scrollBar.style.width = `${e.progress * 100}%`
      }
      
      const nav = document.getElementById('navbar')
      if (e.animatedScroll > 80) {
        nav?.classList.add(s.scrolled)
      } else {
        nav?.classList.remove(s.scrolled)
      }
    })

    // Cursor Tracking
    const moveCursor = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = `${e.clientX}px`
        cursorDotRef.current.style.top = `${e.clientY}px`
      }
    }
    
    // Magnetic Pull logic using Lerp
    // Buttery smooth snap toward cursor if distance < 100px
    const applyMagnetic = (ref: React.RefObject<HTMLDivElement>, baseScale=1) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distX = mouse.current.x - centerX
      const distY = mouse.current.y - centerY
      
      const dist = Math.sqrt(distX * distX + distY * distY)
      if (dist < 100) {
        // Snap towards mouse
        const pullX = distX * 0.4
        const pullY = distY * 0.4
        
        gsapCore.to(ref.current, {
            x: pullX,
            y: pullY,
            scale: 1.05 * baseScale,
            duration: 0.6,
            ease: "power2.out",
            overwrite: "auto"
        })
      } else {
        // Relax back to natural floating
        gsapCore.to(ref.current, {
            x: 0,
            y: 0,
            scale: 1 * baseScale,
            duration: 1.2,
            ease: "elastic.out(1, 0.3)",
            overwrite: "auto"
        })
      }
    }

    // Render Ripple / Parallax loop
    let req: number
    const renderRipple = () => {
      delayedMouse.current.x += (mouse.current.x - delayedMouse.current.x) * 0.1
      delayedMouse.current.y += (mouse.current.y - delayedMouse.current.y) * 0.1
      
      if (cursorRingRef.current) {
        cursorRingRef.current.style.left = `${delayedMouse.current.x}px`
        cursorRingRef.current.style.top = `${delayedMouse.current.y}px`
      }

      // Flashlight cursor effect
      if (flashlightRef.current) {
        flashlightRef.current.style.left = `${delayedMouse.current.x}px`
        flashlightRef.current.style.top = `${delayedMouse.current.y}px`
      }

      // Mouse-Follow Parallax for Hero
      if (bottleWrapperRef.current && phantomRef.current) {
        const { innerWidth, innerHeight } = window
        const normX = (delayedMouse.current.x / innerWidth - 0.5)
        const normY = (delayedMouse.current.y / innerHeight - 0.5)

        // The bottle tilts slightly based on mouse, IN ADDITION to scrolltrigger rotation!
        // We use string replacement to add rotationX to the element
        gsapCore.to(bottleWrapperRef.current, {
            rotationX: normY * -15,   // Mouse up/down tilts bottle
            x: normX * 40,            // Slight X shift
            duration: 0.8,
            ease: "power2.out"
        })
        
        gsapCore.to(phantomRef.current, {
            x: normX * -80,
            y: normY * -80,
            duration: 1.2,
            ease: "power2.out"
        })

        if (bottleGlowRef.current) {
             gsapCore.to(bottleGlowRef.current, {
                x: normX * -30,
                y: normY * -30,
                duration: 1.2,
                ease: "power2.out"
            })
        }
      }

      // Magnetic Badges
      applyMagnetic(badge1Ref)
      applyMagnetic(badge2Ref)
      applyMagnetic(badge3Ref)

      req = requestAnimationFrame(renderRipple)
    }
    
    window.addEventListener('mousemove', moveCursor)
    req = requestAnimationFrame(renderRipple)

    // STAGGERED REVEALS 
    // Cubic-bezier(0.16, 1, 0.3, 1) implemented via GSAP 'expo.out' which is practically identical
    const revealElements = document.querySelectorAll(`.${s.revealItem}, .${s.statCol}`)
    revealElements.forEach((el) => {
       // Reset CSS transforms to let GSAP handle it
       (el as HTMLElement).style.opacity = '0';
       (el as HTMLElement).style.transform = 'translateY(40px)';
       
       ScrollTrigger.create({
           trigger: el,
           start: "top 90%",
           onEnter: () => {
               // Extract inline transition delay if we set it for staggers previously
               const delayStr = (el as HTMLElement).style.transitionDelay || '0s'
               const delay = parseFloat(delayStr)
               
               gsapCore.to(el, {
                   opacity: 1,
                   y: 0,
                   duration: 1.2,
                   delay: delay,
                   ease: "expo.out",
                   overwrite: "auto"
               })
               // Clear the inline CSS transition so it doesn't conflict
               ;(el as HTMLElement).style.transition = 'none'
           },
           once: true
       })
    })

    return () => {
      lenis.destroy()
      window.removeEventListener('mousemove', moveCursor)
      cancelAnimationFrame(req)
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  const ingredients = [
    { num: '01', name: 'ASHWAGANDHA', latin: 'Withania somnifera', ben: 'Stress adaptation, cortisol regulation, sustained energy.', tags: ['ADAPTOGEN', 'STRESS', 'ENERGY'], dose: '600' },
    { num: '02', name: "LION'S MANE", latin: 'Hericium erinaceus', ben: 'Cognitive enhancement, neuroplasticity, focus.', tags: ['NOOTROPIC', 'FOCUS', 'MEMORY'], dose: '500' },
    { num: '03', name: 'REISHI', latin: 'Ganoderma lucidum', ben: 'Immune modulation, calm without sedation.', tags: ['IMMUNITY', 'CALM', 'LONGEVITY'], dose: '400' },
    { num: '04', name: 'SCHISANDRA', latin: 'Schisandra chinensis', ben: 'Liver support, physical endurance, mental clarity.', tags: ['ENDURANCE', 'CLARITY', 'DETOX'], dose: '300' },
    { num: '05', name: 'RHODIOLA', latin: 'Rhodiola rosea', ben: 'Fatigue resistance, mood elevation, performance.', tags: ['PERFORMANCE', 'MOOD', 'STAMINA'], dose: '200' },
    { num: '06', name: 'HOLY BASIL', latin: 'Ocimum tenuiflorum', ben: 'Neural protection, anti-inflammatory, vitality.', tags: ['VITALITY', 'PROTECTION', 'MIND'], dose: '150' },
  ]

  const stats = [
    { num: '100%', label: 'NATURAL ACTIVE INGREDIENTS' },
    { num: '8', label: 'PREMIUM BOTANICALS' },
    { num: '30', label: 'DAY SUPPLY PER BOX' },
    { num: '4,000', label: 'YEARS COMBINED RESEARCH' },
  ]

  return (
    <div className={s.container}>
      <div id="scroll-progress" style={{ position: 'fixed', top: 0, left: 0, height: '2px', background: 'linear-gradient(90deg, var(--nectar-amber), var(--nectar-blush))', zIndex: 61, width: '0%', transition: 'none' }}></div>

      {/* Cinematic Post-Processing: Custom Flashlight Cursor */}
      <div ref={flashlightRef} className={s.flashlight}></div>
      <div ref={cursorDotRef} className={s.cursorDot}></div>
      <div ref={cursorRingRef} className={s.cursorRing}></div>

      {/* Preloader */}
      <div className={`${s.preloader} ${!loading ? s.hidden : ''}`}>
        <svg className={s.diamondSvg} viewBox="0 0 24 24"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>
        <div className={s.preloaderWordmark}>N<span>E</span>CTAR</div>
        <div className={s.progressContainer}>
          <div className={s.progressFill} style={{ width: `${progress}%` }}></div>
        </div>
        <div className={s.preloaderText}>PREPARING YOUR RITUAL</div>
      </div>

      {/* Navigation */}
      <nav id="navbar" className={s.nav}>
        <div className={s.navLeft}>
          <div className={s.navWordmark}>
            N<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>CTAR
          </div>
          <div className={s.separator}></div>
          <a href="#" className={s.navLink}>01 — THE RITUAL</a>
        </div>
        <div className={s.navRight}>
          <a href="#" className={s.navLink}>SCIENCE</a>
          <a href="#" className={s.navLink}>ORIGIN</a>
          <div className={s.separator}></div>
          <button className={s.btnPrimary}>
            PRE-ORDER <span className={s.btnArrow}>→</span>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className={s.hero} ref={heroRef}>
        <div className={s.heroPhantom} ref={phantomRef} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>NECTAR</div>
        <div className={s.heroGrid}>
          <div className={s.heroLeft}>
            <div className={`${s.microLabel} ${s.revealItem}`} style={{ transitionDelay: '0s' }}>
              <div className={s.microLabelLine}></div>
              01 — FUNCTIONAL WELLNESS TONIC
            </div>
            <div className={`${s.heroHeadline1} ${s.revealItem}`} style={{ transitionDelay: '0.1s' }}>DRINK</div>
            <div className={`${s.heroHeadline2} ${s.revealItem}`} style={{ transitionDelay: '0.2s' }}>THE</div>
            <div className={`${s.heroHeadline3} ${s.revealItem}`} style={{ transitionDelay: '0.3s' }}>N<span>E</span>CTAR</div>
            <p className={`${s.heroBody} ${s.revealItem}`} style={{ transitionDelay: '0.4s' }}>
              Your daily ritual, distilled from earth&apos;s most potent botanicals. Not a supplement. A transformation.
            </p>
            <div className={`${s.heroCtaRow} ${s.revealItem}`} style={{ transitionDelay: '0.5s' }}>
              <button className={`${s.btnPrimary} ${s.btnHero}`}>BEGIN THE RITUAL <span className={s.btnArrow}>→</span></button>
              <a href="#" className={s.linkSecondary}>LEARN MORE</a>
            </div>
            <div className={`${s.scrollIndicator} ${s.revealItem}`} style={{ transitionDelay: '0.6s' }}>
              <span className={s.scrollText}>SCROLL</span>
              <div className={s.scrollLineContainer}><div className={s.scrollLineFill}></div></div>
            </div>
          </div>
          
          <div className={s.heroRight}>
            <div className={s.subContent}>
              <div className={s.subContent1}>FORMULATED FOR PEAK VITALITY</div>
              <div className={s.subContent2}>Est. 2025 — Batch 001</div>
            </div>
            
            {/* 3D BOTTLE ENGINE */}
            <div className={s.bottleWrapper} ref={bottleWrapperRef}>
              <div className={s.bottleGlow} ref={bottleGlowRef} style={{ zIndex: 1, transform: 'translate(-50%, -50%)' }}></div>
              <div className={s.bottleNeck} style={{ zIndex: 2 }}></div>
              <div className={s.bottleCap} style={{ zIndex: 2 }}></div>
              
              <div className={s.bottleBody} ref={bottleBodyRef} style={{ zIndex: 3 }}>
                <div className={s.bottleLiquid} ref={bottleLiquidSloshRef}></div>
                <div className={s.bottleGlint} ref={bottleGlintRef} style={{ zIndex: 4 }}></div>
                <div className={s.bottleLabel} style={{ zIndex: 5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--nectar-amber)" strokeWidth="2" style={{width:16,height:16}}><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>
                  <div className={s.bottleBrandName}>NECTAR</div>
                  <div className={s.bottleTonicText}>FUNCTIONAL TONIC</div>
                  <hr className={s.bottleHr}/>
                  <div className={s.bottleVol}>100ml</div>
                </div>
              </div>
              
              <div className={s.badgeWrapper} ref={badge1Ref} style={{ position: 'absolute', top: 60, right: -40, zIndex: 40}}>
                <div className={s.bottleBadge}>ADAPTOGEN BLEND<br/>8 BOTANICALS</div>
              </div>
              <div className={s.badgeWrapper} ref={badge2Ref} style={{ position: 'absolute', top: '40%', left: -60, zIndex: 40 }}>
                <div className={s.bottleBadge}>ZERO SUGAR<br/>CERTIFIED ORGANIC</div>
              </div>
              <div className={s.badgeWrapper} ref={badge3Ref} style={{ position: 'absolute', top: '75%', right: -30, zIndex: 40 }}>
                <div className={s.bottleBadge}>LAB VERIFIED<br/>BATCH 001</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className={s.marqueeSection}>
        <div className={s.marqueeTrack}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={s.marqueeText}>
              ADAPTOGEN ELIXIR <span className={s.dot}>•</span> CRAFTED WITH PURPOSE <span className={s.dot}>•</span> NECTAR <span className={s.amber}>✦</span> <span className={s.dot}>•</span> PEAK VITALITY <span className={s.dot}>•</span> FUNCTIONAL WELLNESS <span className={s.dot}>•</span> NATURE ENCODED <span className={s.dot}>•</span>&nbsp;
            </div>
          ))}
        </div>
      </section>

      {/* Horizontal Scroll Pulse */}
      <section className={s.pulseSection} ref={pulseSectionRef}>
        <div className={s.pulseContainer} ref={pulseContainerRef}>
          <div className={`${s.pulseHeader} ${s.revealItem}`}>
            <div className={s.sectionCounter}>02 —</div>
            <div className={s.pulseHeadline1}>THE</div>
            <div className={s.pulseHeadline2}>PULSE</div>
            <p className={s.pulseBody}>Six potent botanicals, precisely sequenced. Each compound amplified by the others.</p>
          </div>
          <div className={`${s.ingredientGrid} ${s.revealItem}`} style={{ transitionDelay: '0.2s' }}>
            {ingredients.map((ing, i) => (
              <div key={i} className={s.ingredientPanel}>
                <div className={s.panelNum}>{ing.num}</div>
                <div className={s.panelShortName}>{ing.name}</div>
                <div className={s.panelDivider}></div>
                
                <div className={s.panelHoverContent}>
                  <div className={s.hoverName}>{ing.name}</div>
                  <div className={s.hoverLatin}>{ing.latin}</div>
                  <hr className={s.hoverHr}/>
                  <div className={s.hoverBody}>{ing.ben}</div>
                  <div className={s.hoverTags}>
                    {ing.tags.map(t => <span key={t} className={s.tag}>[{t}]</span>)}
                  </div>
                  <div className={s.hoverDosage}>
                    <div className={s.doseNum}>{ing.dose}</div>
                    <div className={s.doseLabel}>MG PER SERVE</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Science */}
      <section className={s.sciSection}>
        <div className={s.sciBg}></div>
        <div className={s.sciRight}>
          <div className={s.glassPanelFloat}>
            <div className={s.sciCounter}>03 —</div>
            <div className={`${s.sciHeadline1} ${s.revealItem}`} style={{ transitionDelay: '0s' }}>THE SCIENCE</div>
            <div className={`${s.sciHeadline2} ${s.revealItem}`} style={{ transitionDelay: '0.1s' }}>OF N<span>E</span>CTAR</div>
            <hr className={s.sciHr}/>
            <p className={`${s.sciBody} ${s.revealItem}`} style={{ transitionDelay: '0.2s' }}>
              Every compound in NECTAR is dosed to clinical efficacy thresholds, not marketing minimums. We work with leading biochemists to sequence absorption — each botanical amplifying the next.
            </p>
            <div className={`${s.revealItem}`} style={{ marginTop: 32, transitionDelay: '0.3s' }}>
              {[
                { p: '01', n: 'FOUNDATION', t: '0-30 MIN' },
                { p: '02', n: 'AMPLIFICATION', t: '30-120 MIN' },
                { p: '03', n: 'INTEGRATION', t: '2-6 HRS' }
              ].map(row => (
                <div key={row.p} className={s.formulaRow}>
                  <div className={s.formPhase}>PHASE {row.p}</div>
                  <div className={s.formName}>{row.n}</div>
                  <div className={s.formTime}>{row.t}</div>
                </div>
              ))}
            </div>
            <div className={`${s.clinNote} ${s.revealItem}`} style={{ transitionDelay: '0.4s' }}>
              All compounds are third-party verified for purity and potency through ISO-certified laboratories.
            </div>
            <div style={{ marginTop: 32, transitionDelay: '0.5s' }} className={`${s.revealItem}`}>
              <a href="#" className={s.linkSecondary} style={{ color: 'var(--nectar-amber)' }}>VIEW FULL RESEARCH →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className={s.originSection}>
        <div className={s.origCol1}>
          <div className={s.origCounter}>04 — ORIGIN</div>
        </div>
        <div className={s.origCol2}>
          <div className={`${s.origGrid} ${s.revealItem}`}>
            <div className={`${s.origImg} ${s.origImg1}`}></div>
            <div className={s.origImg} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1549488344-c10425a5acfd?q=80&w=2670&auto=format&fit=crop')" }}></div>
            <div className={s.origImg} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1582037928769-181f2644ffb9?q=80&w=2672&auto=format&fit=crop')" }}></div>
          </div>
          <div className={s.origHeroText}>
            <div className={`${s.origHead1} ${s.revealItem}`} style={{ transitionDelay: '0.1s' }}>ANCIENT</div>
            <div className={`${s.origHead2} ${s.revealItem}`} style={{ transitionDelay: '0.2s' }}>ROOTS.</div>
            <p className={`${s.origBody} ${s.revealItem}`} style={{ transitionDelay: '0.3s' }}>
              NECTAR draws from 4,000 years of Ayurvedic and Taoist herbal wisdom. Our founders spent three years in sourcing — from the Himalayan foothills to Amazonian biodiversity reserves — to find ingredients that outperform their synthetic equivalents.
            </p>
          </div>
          <div className={`${s.origQuoteBlock} ${s.revealItem}`} style={{ transitionDelay: '0.4s' }}>
            <div className={s.origQuote}>&quot;We don&apos;t chase trends. We excavate truth.&quot;</div>
            <div className={s.origQuoteAuth}>— NECTAR Co-Founders</div>
          </div>
        </div>
        <div className={s.origCol3}>
          <div className={`${s.origStat} ${s.revealItem}`} style={{ transitionDelay: '0.1s' }}>
            <div className={s.ostNum}>4,200</div>
            <div className={s.ostLab}>YEARS OF HERBAL HISTORY</div>
          </div>
          <div className={`${s.origStat} ${s.revealItem}`} style={{ transitionDelay: '0.2s' }}>
            <div className={s.ostNum}>12</div>
            <div className={s.ostLab}>SOURCE COUNTRIES</div>
          </div>
          <div className={`${s.origStat} ${s.revealItem}`} style={{ transitionDelay: '0.3s' }}>
            <div className={s.ostNum}>3 YRS</div>
            <div className={s.ostLab}>R&D BEFORE FORMULA LOCK</div>
          </div>
        </div>
      </section>

      {/* Ritual Stats */}
      <section className={s.statsSection}>
        <div className={s.statsRadial}></div>
        <div className={s.statsGrid}>
          {stats.map((stat, i) => (
            <div key={i} className={s.statCol} style={{ transitionDelay: `${i * 100}ms` }}>
              <div className={s.statNum}>{stat.num}</div>
              <div className={s.statLine}></div>
              <div className={s.statLab}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pre-Order CTA */}
      <section className={s.poSection}>
        <div className={s.poGlow}></div>
        <div className={s.poPhantom}>PRE-ORDER</div>
        
        <div className={s.poContent}>
          <div className={`${s.microLabel} ${s.revealItem}`} style={{ margin: '0 auto 32px', transitionDelay: '0s' }}>
            <div className={s.microLabelLine}></div>
            05 — SECURE YOUR RITUAL
            <div className={s.microLabelLine}></div>
          </div>
          
          <div className={`${s.poHeadStack}`}>
            <div className={`${s.poHead1} ${s.revealItem}`} style={{ transitionDelay: '0.1s' }}>BECOME</div>
            <div className={`${s.poHead2} ${s.revealItem}`} style={{ transitionDelay: '0.2s' }}>WHAT</div>
            <div className={`${s.poHead3} ${s.revealItem}`} style={{ transitionDelay: '0.3s' }}>YOU ARE</div>
          </div>
          
          <p className={`${s.poBody} ${s.revealItem}`} style={{ transitionDelay: '0.4s', margin: '32px auto 0' }}>
            Limited to 500 bottles. Batch 001 ships Q1 2026. Price locks at pre-order. No obligation until dispatch.
          </p>
          
          <div className={`${s.poForm} ${s.revealItem}`} style={{ transitionDelay: '0.5s' }}>
            <div className={s.poInputRow}>
              <input type="email" placeholder="YOUR EMAIL ADDRESS" className={s.poInput} />
              <button className={s.poBtn}>BEGIN RITUAL <span className={s.poBtnArrow}>→</span></button>
            </div>
            <label className={s.poCheckRow}>
              <input type="checkbox" className={s.poCheck} />
              <span className={s.poCheckLab}>I accept the Privacy Policy and want to receive NECTAR updates.</span>
            </label>
          </div>
        </div>

        <div className={s.bottomStrip}>
          <div className={s.bsLeft}>NECTAR © 2026</div>
          <div className={s.bsCenter}>LIMITED TO 500 UNITS</div>
          <div className={s.bsRight}>MADE WITH INTENTION</div>
        </div>
      </section>
    </div>
  )
}
