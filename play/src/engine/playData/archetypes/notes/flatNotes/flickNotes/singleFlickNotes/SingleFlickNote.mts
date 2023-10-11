import { options } from '../../../../../../configuration/options.mjs'
import { minFlickVR } from '../../../../../flick.mjs'
import { windows } from '../../../../../windows.mjs'
import { claimStart, disallowEmpty, disallowEnd } from '../../../../InputManager.mjs'
import { FlickNote } from '../FlickNote.mjs'

export abstract class SingleFlickNote extends FlickNote {
    activated = this.entityMemory(Boolean)

    touch() {
        if (options.autoplay) return

        if (time.now < this.inputTime.min) return

        for (const touch of touches) {
            if (touch.vr < minFlickVR) continue
            if (!this.fullHitbox.contains(touch.lastPosition)) continue

            if (touch.startTime < this.inputTime.min) continue

            disallowEmpty(touch)
            disallowEnd(touch, this.targetTime + windows.slideEndLockoutDuration)

            this.complete(touch)
            return
        }
    }
}
