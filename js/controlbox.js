define(['d3'], function () {
    "use strict";

    /**
     * @class ControlBox
     * @constructor
     */
    function ControlBox(config) {
        this.historyView = config.historyView;
        this.originView = config.originView;
        this.initialMessage = config.initialMessage || 'Nhập các lệnh git dưới đây.';
        this._commandHistory = [];
        this._currentCommand = -1;
        this._tempCommand = '';
        this.rebaseConfig = {}; // to configure branches for rebase
    }

    ControlBox.prototype = {
        render: function (container) {
            var cBox = this,
                cBoxContainer, log, input;

            cBoxContainer = container.append('div')
                .classed('control-box', true);

            cBoxContainer.style('height', this.historyView.height + 5 + 'px');

            log = cBoxContainer.append('div')
                .classed('log', true)
                .style('height', this.historyView.height - 20 + 'px');

            input = cBoxContainer.append('input')
                .attr('type', 'text')
                .attr('placeholder', 'nhập lệnh git');

            input.on('keyup', function () {
                var e = d3.event;

                switch (e.keyCode) {
                case 13:
                    if (this.value.trim() === '') {
                        break;
                    }

                    cBox._commandHistory.unshift(this.value);
                    cBox._tempCommand = '';
                    cBox._currentCommand = -1;
                    cBox.command(this.value);
                    this.value = '';
                    e.stopImmediatePropagation();
                    break;
                case 38:
                    var previousCommand = cBox._commandHistory[cBox._currentCommand + 1];
                    if (cBox._currentCommand === -1) {
                        cBox._tempCommand = this.value;
                    }

                    if (typeof previousCommand === 'string') {
                        cBox._currentCommand += 1;
                        this.value = previousCommand;
                        this.value = this.value; // set cursor to end
                    }
                    e.stopImmediatePropagation();
                    break;
                case 40:
                    var nextCommand = cBox._commandHistory[cBox._currentCommand - 1];
                    if (typeof nextCommand === 'string') {
                        cBox._currentCommand -= 1;
                        this.value = nextCommand;
                        this.value = this.value; // set cursor to end
                    } else {
                        cBox._currentCommand = -1;
                        this.value = cBox._tempCommand;
                        this.value = this.value; // set cursor to end
                    }
                    e.stopImmediatePropagation();
                    break;
                }
            });

            this.container = cBoxContainer;
            this.log = log;
            this.input = input;

            this.info(this.initialMessage);
        },

        destroy: function () {
            this.log.remove();
            this.input.remove();
            this.container.remove();

            for (var prop in this) {
                if (this.hasOwnProperty(prop)) {
                    this[prop] = null;
                }
            }
        },

        _scrollToBottom: function () {
            var log = this.log.node();
            log.scrollTop = log.scrollHeight;
        },

        command: function (entry) {
            if (entry.trim === '') {
                return;
            }

            var split = entry.split(' ');

            this.log.append('div')
                .classed('command-entry', true)
                .html(entry);

            this._scrollToBottom();

            if (split[0] !== 'git') {
                return this.error();
            }

            var method = split[1],
                args = split.slice(2);

            try {
                if (typeof this[method] === 'function') {
                    this[method](args);
                } else {
                    this.error();
                }
            } catch (ex) {
                var msg = (ex && ex.message) ? ex.message: null;
                this.error(msg);
            }
        },

        info: function (msg) {
            this.log.append('div').classed('info', true).html(msg);
            this._scrollToBottom();
        },

        error: function (msg) {
            msg = msg || 'Không hiểu lệnh này!';
            this.log.append('div').classed('error', true).html(msg);
            this._scrollToBottom();
        },

        commit: function () {
            this.historyView.commit();
        },

        branch: function (args) {
            if (args.length < 1) {
                this.info(
                    'Bạn phải chỉ ra tên nhánh. ' +
                    'Nếu bạn không chỉ ra tên cụ thể, ' +
                    'lệnh này sẽ liệt kê các nhánh cục bộ của bạn ra màn hình.'
                );

                return;
            }

            while (args.length > 0) {
                var arg = args.shift();

                switch (arg) {
                case '--remote':
                    this.info(
                        'Lệnh này thông thường sẽ hiển thị tất các các nhánh đang theo dõi từ xa'
                    );
                    args.length = 0;
                    break;
                case '-d':
                    var name = args.pop();
                    this.historyView.deleteBranch(name);
                    break;
                default:
                    var remainingArgs = [arg].concat(args);
                    args.length = 0;
                    this.historyView.branch(remainingArgs.join(' '));
                }
            }
        },

        checkout: function (args) {
            while (args.length > 0) {
                var arg = args.shift();

                switch (arg) {
                case '-b':
                    var name = args[args.length - 1];
                    try {
                        this.historyView.branch(name);
                    } catch (err) {
                        if (err.message.indexOf('already exists') === -1) {
                            throw new Error(err.message);
                        }
                    }
                    break;
                default:
                    var remainingArgs = [arg].concat(args);
                    args.length = 0;
                    this.historyView.checkout(remainingArgs.join(' '));
                }
            }
        },

        reset: function (args) {
            while (args.length > 0) {
                var arg = args.shift();

                switch (arg) {
                case '--soft':
                    this.info(
                        'Tùy chọn "--soft" hoạt động trên git thật ' +
                        'Nhưng trong bản demo này thì không thể. ' +
                        'Nên thay vào đó chỉ có thể cho bạn thấy tùy chọn "--hard" mà thôi.'
                    );
                    break;
                case '--mixed':
                    this.info(
                        'Tùy chọn "--mixed" hoạt động trên git thật ' +
                        'Nhưng trong bản demo này thì không thể. '
                    );
                    break;
                case '--hard':
                    this.historyView.reset(args.join(' '));
                    args.length = 0;
                    break;
                default:
                    var remainingArgs = [arg].concat(args);
                    args.length = 0;
                    this.info('Đang giả định "--hard".');
                    this.historyView.reset(remainingArgs.join(' '));
                }
            }
        },

        clean: function (args) {
            this.info('Đang xóa tất các các tệp không được theo dõi...');
        },

        revert: function (args) {
            this.historyView.revert(args.shift());
        },

        merge: function (args) {
            var ref = args.shift(),
                result = this.historyView.merge(ref);

            if (result === 'Fast-Forward') {
                this.info('Bạn đã thực hiệc việc trộn chuyển tiếp nhanh (fast-forward merge).');
            }
        },

        rebase: function (args) {
            var ref = args.shift(),
                result = this.historyView.rebase(ref);

            if (result === 'Fast-Forward') {
                this.info('Đã chuyển tiếp nhanh đến ' + ref + '.');
            }
        },

        fetch: function () {
            if (!this.originView) {
                throw new Error('Không có máy chủ từ xa để lấy về.');
            }

            var origin = this.originView,
                local = this.historyView,
                remotePattern = /^origin\/([^\/]+)$/,
                rtb, isRTB, fb,
                fetchBranches = {},
                fetchIds = [], // just to make sure we don't fetch the same commit twice
                fetchCommits = [], fetchCommit,
                resultMessage = '';

            // determine which branches to fetch
            for (rtb = 0; rtb < local.branches.length; rtb++) {
                isRTB = remotePattern.exec(local.branches[rtb]);
                if (isRTB) {
                    fetchBranches[isRTB[1]] = 0;
                }
            }

            // determine which commits the local repo is missing from the origin
            for (fb in fetchBranches) {
                if (origin.branches.indexOf(fb) > -1) {
                    fetchCommit = origin.getCommit(fb);

                    var notInLocal = local.getCommit(fetchCommit.id) === null;
                    while (notInLocal) {
                        if (fetchIds.indexOf(fetchCommit.id) === -1) {
                            fetchCommits.unshift(fetchCommit);
                            fetchIds.unshift(fetchCommit.id);
                        }
                        fetchBranches[fb] += 1;
                        fetchCommit = origin.getCommit(fetchCommit.parent);
                        notInLocal = local.getCommit(fetchCommit.id) === null;
                    }
                }
            }

            // add the fetched commits to the local commit data
            for (var fc = 0; fc < fetchCommits.length; fc++) {
                fetchCommit = fetchCommits[fc];
                local.commitData.push({
                    id: fetchCommit.id,
                    parent: fetchCommit.parent,
                    tags: []
                });
            }

            // update the remote tracking branch tag locations
            for (fb in fetchBranches) {
                if (origin.branches.indexOf(fb) > -1) {
                    var remoteLoc = origin.getCommit(fb).id;
                    local.moveTag('origin/' + fb, remoteLoc);
                }

                resultMessage += 'Đã lấy ' + fetchBranches[fb] + ' các commit trên ' + fb + '.</br>';
            }

            this.info(resultMessage);

            local.renderCommits();
        },

        pull: function (args) {
            var control = this,
                local = this.historyView,
                currentBranch = local.currentBranch,
                rtBranch = 'origin/' + currentBranch,
                isFastForward = false;

            this.fetch();

            if (!currentBranch) {
                throw new Error('Bạn đang không ở trên 1 nhánh.');
            }

            if (local.branches.indexOf(rtBranch) === -1) {
                throw new Error('Nhánh hiện tại không được thiết lập để kéo về.');
            }

            setTimeout(function () {
                try {
                    if (args[0] === '--rebase' || control.rebaseConfig[currentBranch] === 'true') {
                        isFastForward = local.rebase(rtBranch) === 'Fast-Forward';
                    } else {
                        isFastForward = local.merge(rtBranch) === 'Fast-Forward';
                    }
                } catch (error) {
                    control.error(error.message);
                }

                if (isFastForward) {
                    control.info('Đã chuyển tiếp nhanh đến ' + rtBranch + '.');
                }
            }, 750);
        },

        push: function (args) {
            var control = this,
                local = this.historyView,
                remoteName = args.shift() || 'origin',
                remote = this[remoteName + 'View'],
                branchArgs = args.pop(),
                localRef = local.currentBranch,
                remoteRef = local.currentBranch,
                localCommit, remoteCommit,
                findCommitsToPush,
                isCommonCommit,
                toPush = [];

            if (remoteName === 'history') {
                throw new Error('Xin lỗi, bạn không thể có 1 tên từ xa "history" trong ví dụ này.');
            }

            if (!remote) {
                throw new Error('There is no remote server named "' + remoteName + '".');
            }

            if (branchArgs) {
                branchArgs = /^([^:]*)(:?)(.*)$/.exec(branchArgs);

                branchArgs[1] && (localRef = branchArgs[1]);
                branchArgs[2] === ':' && (remoteRef = branchArgs[3]);
            }

            if (local.branches.indexOf(localRef) === -1) {
                throw new Error('Tham chiếu cục bộ: ' + localRef + ' không tồn tại.');
            }

            if (!remoteRef) {
                throw new Error('Không có nhánh từ xa nào được chỉ định để đẩy lên');
            }

            localCommit = local.getCommit(localRef);
            remoteCommit = remote.getCommit(remoteRef);

            findCommitsToPush = function findCommitsToPush(localCommit) {
                var commitToPush,
                    isCommonCommit = remote.getCommit(localCommit.id) !== null;

                while (!isCommonCommit) {
                    commitToPush = {
                        id: localCommit.id,
                        parent: localCommit.parent,
                        tags: []
                    };

                    if (typeof localCommit.parent2 === 'string') {
                        commitToPush.parent2 = localCommit.parent2;
                        findCommitsToPush(local.getCommit(localCommit.parent2));
                    }

                    toPush.unshift(commitToPush);
                    localCommit = local.getCommit(localCommit.parent);
                    isCommonCommit = remote.getCommit(localCommit.id) !== null;
                }
            };

            // push to an existing branch on the remote
            if (remoteCommit && remote.branches.indexOf(remoteRef) > -1) {
                if (!local.isAncestor(remoteCommit.id, localCommit.id)) {
                    throw new Error('Từ chối đẩy. Không phải chuyển tíêp nhanh.');
                }

                isCommonCommit = localCommit.id === remoteCommit.id;

                if (isCommonCommit) {
                    return this.info('Mọi thứ đã được cập nhật');
                }

                findCommitsToPush(localCommit);

                remote.commitData = remote.commitData.concat(toPush);
                remote.moveTag(remoteRef, toPush[toPush.length - 1].id);
                remote.renderCommits();
            } else {
                this.info('Xin lỗi, vịêc tạo các nhánh mới hiện tại chưa được hỗ trợ.');
            }
        },

        config: function (args) {
            var path = args.shift().split('.');

            if (path[0] === 'branch') {
                if (path[2] === 'rebase') {
                    this.rebase[path[1]] = args.pop();
                }
            }
        }
    };

    return ControlBox;
});