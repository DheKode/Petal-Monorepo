import '@petal/ui/fonts.css';
import '@petal/ui/theme.css';
import './styles/index.css';
import {loadArtwork} from './utils/assets';
import {initializeDownloads} from './hooks/initializeDownloads';
import {bindHistoryReview} from './hooks/bindHistoryReview';

loadArtwork();
initializeDownloads();
const disposeHistoryReview = bindHistoryReview();
import.meta.hot?.dispose(disposeHistoryReview);
