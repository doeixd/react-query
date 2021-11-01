import { notifyManager } from '../core'
import {batch} from 'solid-js'

notifyManager.setBatchNotifyFunction(batch)
