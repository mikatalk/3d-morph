const SIZE = 16;

export default class Sound {

    constructor (src) {

        this.fftSize = 2048//SIZE*SIZE;

        this.context = null;
        this.audioBuffer;
        this.analyser;
        this.javascriptNode;
        
        this.setupAudioNodes();

        // this.fbo = this.createFBO();
        
        let request = new XMLHttpRequest();
        request.open('GET', src, true);
        request.responseType = 'arraybuffer';
        request.onload = () => this.loadAudioData(request.response);
        request.send();

        this.frameData = new Float32Array( SIZE * SIZE * 4 );

        this.texture = new THREE.DataTexture( this.frameData, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType );
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.needsUpdate = true;

        this.averageVolume = 0;

    }

    createAudioContext () {
        if ('AudioContext' in window) {
            return new AudioContext();
        }
    }

    setupAudioNodes () {
       
        this.context = this.createAudioContext();

        window.javascriptNode = this.context.createScriptProcessor(SIZE*SIZE, 1, 1);
        window.javascriptNode.connect(this.context.destination);
        window.javascriptNode.onaudioprocess = this.handleAudioStream.bind(this);

        this.analyser = this.context.createAnalyser();
        this.analyser.smoothingTimeConstant = .6;
        this.analyser.fftSize = this.fftSize;

        this.sourceNode = this.context.createBufferSource();
        this.sourceNode.connect(this.analyser);
        this.sourceNode.connect(this.context.destination);

        this.analyser.connect(window.javascriptNode);

    }

    loadAudioData (buffer) {
        if (this.context.decodeAudioData) {
            console.log('audio ready...')
            this.context.decodeAudioData(buffer, (b) => {
                this.audioBuffer = b;
                this.startOffset = this.context.currentTime;
                this.sourceNode = this.context.createBufferSource();
                this.sourceNode.buffer = this.audioBuffer;
                this.sourceNode.connect(this.analyser);
                this.sourceNode.connect(this.context.destination);
                this.sourceNode.start(0, 0);
                
            });
        }
    }

    handleAudioStream (e) {
        if ( !this.isPlaying()  ) {
            return;
        }
        
        // this.analyser.getFloatFrequencyData(this.frameData);
        // this.texture.needsUpdate = true;


        let array = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(array);
        let average = 0;
        for(let i=0, l=array.length; i<l; i++) {
            average += parseFloat(array[i]);
        }
        this.averageVolume = average/array.length;


// console.log(this.averageVolume )
    }

    toggle () {
        if( this.isPlaying() ) {
            this.context.suspend()
        } else if ( this.isSuspended() ) {
            this.context.resume()
        }
    }

    isPlaying (){
        return this.context.state === 'running'
    }

    isSuspended (){
        return this.context.state === 'suspended'
    }

    stamp () {
        if ( this.context && this.startOffset != -1 )
            return parseInt( (this.context.currentTime-this.startOffset) * 124 / 60 * 100); 
        else return 0;
    }
}
