import { FlickDirection } from '../../../../../../../../shared/src/engine/data/FlickDirection.mjs'
import { getArrowSpriteId } from '../../../../../../../../shared/src/engine/data/arrowSprites.mjs'
import { options } from '../../../../../configuration/options.mjs'
import { linearEffectLayout } from '../../../../particle.mjs'
import { scaledScreen } from '../../../../scaledScreen.mjs'
import { getZ, layer, skin } from '../../../../skin.mjs'
import { FlatNote } from '../FlatNote.mjs'

export abstract class FlickNote extends FlatNote {
    leniency = 1

    abstract arrowSprites: {
        up: SkinSprite[]
        left: SkinSprite[]
        fallback: SkinSprite
    }

    abstract directionalEffect: ParticleEffect

    flickData = this.defineData({
        direction: { name: 'direction', type: DataType<FlickDirection> },
        correctdirection: { name: 'correctdirection', type: DataType<boolean> },
    })

    arrow = this.entityMemory({
        sprite: SkinSpriteId,
        layout: Quad,
        animation: Vec,
        z: Number,
    })

    preprocess() {
        super.preprocess()

        if (options.mirror) this.flickData.direction *= -1
    }

    initialize() {
        super.initialize()

        if (options.replay && this.result.judgment === Judgment.Perfect)
            this.result.judgment = this.flickData.correctdirection
                ? Judgment.Perfect
                : Judgment.Great

        this.arrow.sprite = getArrowSpriteId(
            this.arrowSprites,
            this.data.size,
            this.flickData.direction,
        )

        if (skin.sprites.exists(this.arrow.sprite)) {
            const w = (Math.clamp(this.data.size, 0, 3) * (-this.flickData.direction || 1)) / 2

            new Rect({
                l: this.data.lane - w,
                r: this.data.lane + w,
                b: 1,
                t: 1 - 2 * Math.abs(w) * scaledScreen.wToH,
            })
                .toQuad()
                .copyTo(this.arrow.layout)
        } else {
            this.arrow.sprite = this.arrowSprites.fallback.id

            const w = Math.clamp(this.data.size / 2, 1, 2)

            new Rect({ l: -1, r: 1, b: 1, t: -1 })
                .toQuad()
                .rotate((Math.PI / 6) * this.flickData.direction)
                .scale(w, w * scaledScreen.wToH)
                .translate(this.data.lane, 1 - w * scaledScreen.wToH)
                .copyTo(this.arrow.layout)
        }

        if (options.markerAnimation)
            new Vec(this.flickData.direction, -2 * scaledScreen.wToH).copyTo(this.arrow.animation)

        this.arrow.z = getZ(layer.note.arrow, this.targetTime, this.data.lane)
    }

    complete(touch: Touch) {
        this.result.judgment = input.judge(touch.time, this.targetTime, this.windows)
        this.result.accuracy = touch.time - this.targetTime

        if (!this.isCorrectDirection(touch)) {
            if (this.result.judgment === Judgment.Perfect) this.result.judgment = Judgment.Great

            if (this.result.accuracy < this.windows.perfect.max)
                this.result.accuracy = this.windows.perfect.max
        }

        this.result.bucket.index = this.bucket.index
        this.result.bucket.value = this.result.accuracy * 1000

        this.playHitEffects(touch.time)

        this.despawn = true
    }

    render() {
        super.render()

        if (options.markerAnimation) {
            const s = Math.mod(time.now, 0.5) / 0.5

            skin.sprites.draw(
                this.arrow.sprite,
                this.arrow.layout.add(this.arrow.animation.mul(s)).mul(this.y),
                this.arrow.z,
                1 - Math.ease('In', 'Cubic', s),
            )
        } else {
            skin.sprites.draw(this.arrow.sprite, this.arrow.layout.mul(this.y), this.arrow.z, 1)
        }
    }

    playNoteEffects() {
        super.playNoteEffects()

        this.playDirectionalNoteEffect()
    }

    playDirectionalNoteEffect() {
        this.directionalEffect.spawn(
            linearEffectLayout({
                lane: this.data.lane,
                shear: this.flickData.direction,
            }),
            0.32,
            false,
        )
    }

    isCorrectDirection(touch: Touch) {
        if (this.flickData.direction === FlickDirection.Up) return true

        const a = Math.PI / 2 - this.flickData.direction
        return touch.dx * Math.cos(a) + touch.dy * Math.sin(a) > 0
    }
}
