import { AfterContentInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HubConnection } from '@microsoft/signalr';
import { Store } from '@ngrx/store';
import { ConnectorService, YtPlayerService } from 'app/core/services';
import { BehaviorSubject, fromEvent, Observable, Subscription } from 'rxjs';
import { delay, take } from 'rxjs/operators';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterContentInit, OnDestroy {

  @ViewChild('footMenu', { static: true }) footMenu: ElementRef;



  $isReadyVideo = new BehaviorSubject<boolean>(false);
  $currentPlaying: Observable<string>;
  private _eventSubscriptions = new Subscription();
  private _isReadySubscription = new Subscription();

  videoId = '';
  reframed: boolean;
  player: YT.Player;
  playingStatue: string
  isloop = true;
  currentGroup: string;
  $currentGroup: Observable<string>;

  currentGroupFormControl = new FormControl('');
  constructor(
    public ytPlayerService: YtPlayerService,
    public tubeConnect: ConnectorService,
    private store: Store<any>,
  ) { }


  /** Special Features
   * special feature for this component
   */
  addListeners(): void {
    const _footMenuHTML = (this.footMenu.nativeElement as HTMLElement);
    const _footoptionArea = _footMenuHTML.querySelector('.foot-menu-area');

    const mouseEnter = fromEvent(_footMenuHTML, 'mouseenter').subscribe(() => {
      _footoptionArea.classList.remove('fadeout');
      _footoptionArea.classList.add('fadein');
    });

    const mouseLeave = fromEvent(_footMenuHTML, 'mouseleave').subscribe(() => {
      _footoptionArea.classList.remove('fadein');
      _footoptionArea.classList.add('fadeout');
    });

    const currentPlaying = this.$currentPlaying.subscribe(playTag => {
      if (playTag.length > 0) {
        this.videoId = playTag;
        this.tubeConnect.serveConnection.invoke('SendGroupTubeLink', this.getCurrentGroup(), playTag);
      }
    })

    const isConnected = this.tubeConnect.isConnected$.subscribe((isconnected) => {
      if (isconnected) {
        this.tubeConnect.serveConnection.invoke('AddGroup', this.getCurrentGroup()).catch(function (err) {
          console.error(err.toString(), 'Error??');
        });
      }
    })
    this._eventSubscriptions.add(mouseLeave);
    this._eventSubscriptions.add(mouseEnter);
    this._eventSubscriptions.add(currentPlaying);
    this._eventSubscriptions.add(isConnected);
  }

  startVideo() {

    this.player = this.ytPlayerService.startVideo(this.videoId);

    this._eventSubscriptions.add(this.player.addEventListener('onStateChange', evt => {
      const isloop: boolean = this.isloop;
      if (evt['data'] === YT.PlayerState.ENDED && isloop) {
        this.player.playVideo();
      }

    }))
  }

  shareVideo(): void {
    this.tubeConnect.serveConnection.invoke('SendTubeLink', this.videoId);
  }

  switchLoop(): void {
    this.isloop = this.isloop ? false : true;
    if (this.player.getPlayerState() === YT.PlayerState.ENDED) {
      this.player.playVideo();
    }
  }

  /** DataControls
   * Store Data get/set
   */
  getStoreDatas(): void {
    this.$currentPlaying = this.store.select(
      state => state.appState.currentPlaying
    )
    this.$currentGroup = this.store.select(
      state => state.appState.currentGroup
    )
  }

  getCurrentGroup(): string {
    let result = '';
    this.$currentGroup.pipe(take(1)).subscribe(g => {
      if (g) {
        this.currentGroupFormControl.setValue(g);
        result = g;

      }
    })
    return result;
  }

  /** LifeCycles
   * lifeCycle hooks below
   */

  ngAfterContentInit(): void {
    this.getStoreDatas();
    this.addListeners();
    this.startVideo();
  }

  ngOnDestroy(): void {
    this._eventSubscriptions.unsubscribe();
    this._isReadySubscription.unsubscribe();
  }

  ngOnInit(): void {

  }


}
