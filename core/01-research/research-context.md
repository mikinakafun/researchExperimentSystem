# Research Context

**Why this system exists.** Read this before the specification — it is what the design is accountable to. This is the research substance extracted from the project's documents; the decision log those documents also contain is deliberately left behind.

## The question

> **匂いに着目した質問設計が、断片的な記憶情報からLLMが生成する物語文章と、その文章に対する記憶体験の評価に与える影響**
>
> How questioning strategy shapes the LLM-generated narrative built from fragmentary memory information, and how the person rates that narrative as memory.

**One sentence:** participants answer questions about a past event under different question focuses; an LLM builds a story from their fragments; the participants rate that story themselves — and we test whether the question focus changed the rating.

The independent variable is the **question focus**, not the input information. Titles that frame it as "the effect of odor-related memory information" mis-describe the method: nothing about the input is manipulated. Only the questions differ.

Avoid "reconstruction" and "自伝的ナラティブの再構成" in framing. This is not a study of whether memory is accurately restored. It is a study of narrative generation from fragments, and of how the result is experienced.

## Background

Two literatures meet here.

**Odor-evoked memory.** Herz's review holds that odor-evoked memories are experienced as more emotional and more evocative than memories cued any other way.

> Herz, R. S. (2016). "The Role of Odor-Evoked Memory in Psychological and Physiological Health." *Brain Sciences*, 6(3), 22. DOI: 10.3390/brainsci6030022

**This finding cannot be used as direct causal grounding for this study.** Herz concerns *actual odor stimuli*. This study presents **no odor at all** — it manipulates only whether the questions direct attention toward smell. Any claim that carries Herz's causal force over to this design is invalid. The literature motivates the question; it does not license the conclusion.

**Olfaction in HCI.** Smell is underused relative to sight and sound in multimodal interaction. Garcia-Ruiz et al. define olfactory displays as interfaces that generate and diffuse odors for a purpose, and survey applications to memory, recall, immersion, and learning.

> Garcia-Ruiz, M. A., Kapralos, B., & Rebolledo-Mendez, G. (2021). "An Overview of Olfactory Displays in Education and Training." *Multimodal Technologies and Interaction*, 5(10), 64. DOI: 10.3390/mti5100064

This positions the work as HCI rather than as a psychology experiment about olfaction.

## The problem being addressed

An earlier version of this project compared **text statistics** of LLM output across prompt variants — emotional valence, arousal, concreteness, sensory word counts. Supervisory review identified the flaw: that design collapses toward "changing the prompt changes the text," which is close to already known.

The redesign moved the measurement from the text to **the person**. What is measured is not what the model wrote, but how the participant experiences what the model wrote about their own memory.

Four concerns define the current shape:

1. Odor is strongly linked to memory and emotion — but whether **questions that direct attention to smell** (as opposed to smell itself) change the recalled fragments or the experience of the resulting narrative is not established.
2. An LLM can produce fluent text from fragmentary input. **Fluency is not accurate recall**, and the design must not let one be mistaken for the other.
3. The measurable quantity is not whether the narrative reproduced the event, but how far the participant finds it *memory-like*, *concrete*, and *emotional*.
4. To attribute a difference to question focus, everything else — number of questions, specificity, response burden, leading-ness — must be held as comparable as possible across conditions.

Point 4 is the direct origin of the `validator`, the fixed 6-turn length, and the `guaranteed fallback`. They are not engineering hygiene; they are what makes the comparison mean anything.

## Purpose and contribution

**Purpose.** Test whether an odor-focused question design changes (a) the memory fragments elicited from a participant and (b) that participant's own rating of the LLM narrative built from them.

**Contribution.** Applying odor-oriented *dialogue design* to LLM-based memory-description support — not presenting odor.

## What is explicitly not claimed

State these boundaries in any writeup:

- **not** that new memories are formed;
- **not** that memory is accurately reconstructed;
- **not** any therapeutic effect;
- **not** an effect of the participant's recalled information alone — the comparison covers the whole chain from question focus through answers through the model's invention to the reading response;
- **not** an effect of AI use as such;
- **not** anything requiring actual odor stimuli.

The narrative **includes model invention**, this is disclosed to participants in every condition, and the ratings are of that disclosed-creative artifact. That is the object of study, not a limitation of it.

## Design commitments

| | |
|---|---|
| Working title | *How Questioning Strategies Shape Autobiographical Narrative Reconstruction* (an LLM-narrative variant is a candidate) |
| Design | Between-subjects; **one condition per participant** |
| Manipulation | Question wording only; **no odor stimulus** |
| Conditions | Visual, Odor (an event-structure arm was retired — `DESIGN.md` §2) |
| Primary outcome | 記憶様感 / perceived memory-likeness |
| Secondary outcomes | 情景構成感, 叙述鮮明性, 感情再体験感 |
| Primary hypothesis | Memory-likeness differs between question conditions (**non-directional**) |
| Primary comparison | Odor vs Visual |
| Pilot language | Japanese is the source; English is a meaning-matched study version, not a literal translation |

**`visual` is not a general control for "all non-olfactory senses."** It is one specific question focus. The study compares question focuses; it does not isolate smell from sensation in general. Do not over-claim this in analysis.

Spontaneous out-of-condition detail from a participant is **accepted but never probed**. "I can't remember" is a valid answer in every condition and must never be treated as a failure.

## Status

This is a **pilot instrument, not an approved protocol.**

**Ethics review will be carried out** for the undergraduate study (reversing an earlier decision not to). The review body, forms, required documents, duration and submission timing are all still undetermined. Consent wording, storage and anonymisation, retention and deletion, and participant recruitment all fall inside its scope, and anything the review requires changed has to come back into these documents. **The start of participant data collection depends on the review outcome** — that dependency is a schedule constraint, not a formality.

**Parameters are not being fixed in advance.** Turn count, model, temperature, candidate count, item set and sample size are pilot values that get re-tuned each time the output is calibrated; the values actually used are what goes into the paper. Nothing here is waiting on an approval to become official. What stays required is that every value and prompt version is recorded on every result, kept operable from one place, and that a version mismatch is refused at save time. The caution that follows: once collection starts, changing a parameter makes condition differences inseparable from generation-setting differences, so freeze the values then and treat later changes as a separate collection. When that freeze happens is not yet decided.

Consent, API-disclosure, and personal-information provisions must be finalised before any human data collection.

Diagnostic quantities that must be recorded and **reported as results of the manipulation, never used as exclusion criteria**: per-condition non-recall rate, substantive answer count, answer length, and (added from live evidence) fallback and neutral-transition counts.


