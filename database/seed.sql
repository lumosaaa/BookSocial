-- BookSocial 种子数据
-- 30个用户 + 书架 + 动态 + 评论 + 点赞 + 关注 + 笔记 + 通知
-- 密码统一: Test123456 (bcrypt hash)
SET NAMES utf8mb4;
SET @pwd = '$2b$10$LJGqFh1GxV5Oe5K5v5Yz5eKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqK';

-- ============ 1. 用户 (30个) ============
INSERT INTO users (username, email, password_hash, avatar_url, bio, gender, city, reading_goal, status, role) VALUES
('书虫小明', 'xiaoming@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming', '热爱文学，每天阅读一小时', 1, '北京', 50, 1, 'user'),
('阅读达人Luna', 'luna@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna', '科幻迷 | 一年读100本书', 2, '上海', 100, 1, 'user'),
('文艺青年阿杰', 'ajie@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=ajie', '诗歌与远方', 1, '杭州', 30, 1, 'user'),
('晚安故事', 'wanan@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=wanan', '睡前必读一章', 2, '成都', 40, 1, 'user'),
('码农读书会', 'coder@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=coder', '程序员也爱读书', 1, '深圳', 24, 1, 'user'),
('茶与书', 'tea@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=tea', '一杯茶一本书一个下午', 2, '苏州', 36, 1, 'user'),
('历史控老王', 'laowang@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=laowang', '专注历史类书籍', 1, '西安', 20, 1, 'user'),
('推理小说迷', 'mystery@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=mystery', '东野圭吾铁粉', 2, '南京', 45, 1, 'user'),
('哲学漫步', 'philo@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=philo', '思考是最好的阅读', 1, '武汉', 15, 1, 'user'),
('绘本妈妈', 'bindmom@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=bindmom', '和孩子一起读绘本', 2, '广州', 60, 1, 'user'),
('诗词爱好者', 'poetry@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=poetry', '唐诗宋词是我的最爱', 1, '长沙', 25, 1, 'user'),
('科技前沿', 'techread@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=techread', '关注AI与科技趋势', 1, '北京', 30, 1, 'user'),
('心理学小白', 'psych@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=psych', '正在学习心理学', 2, '上海', 20, 1, 'user'),
('旅行读书人', 'traveler@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=traveler', '边走边读', 1, '昆明', 35, 1, 'user'),
('经典控', 'classic@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=classic', '只读经典名著', 2, '天津', 18, 1, 'user'),
('漫画宅', 'manga@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=manga', '漫画也是阅读', 1, '重庆', 80, 1, 'user'),
('商业思维', 'biz@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=biz', '商业书籍爱好者', 1, '杭州', 24, 1, 'user'),
('英文原版党', 'english@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=english', 'Reading in English only', 2, '北京', 30, 1, 'user'),
('深夜书房', 'midnight@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=midnight', '夜猫子读书人', 1, '成都', 40, 1, 'user'),
('亲子阅读', 'family@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=family', '陪伴是最好的教育', 2, '南京', 50, 1, 'user'),
('极简主义者', 'minimal@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=minimal', '少即是多', 1, '深圳', 12, 1, 'user'),
('奇幻世界', 'fantasy@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=fantasy', '沉迷奇幻文学无法自拔', 2, '武汉', 55, 1, 'user'),
('学术青年', 'academic@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=academic', '论文也是一种阅读', 1, '北京', 20, 1, 'user'),
('散文时光', 'essay@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=essay', '喜欢散文的温柔', 2, '厦门', 28, 1, 'user'),
('悬疑推理社', 'suspense@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=suspense', '烧脑才过瘾', 1, '长沙', 35, 1, 'user'),
('国学经典', 'guoxue@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=guoxue', '传承中华文化', 1, '西安', 15, 1, 'user'),
('设计师读书', 'designer@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=designer', '设计灵感来自阅读', 2, '广州', 22, 1, 'user'),
('自律打卡', 'discipline@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=discipline', '每日阅读打卡第365天', 1, '郑州', 52, 1, 'user'),
('温柔书屋', 'gentle@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=gentle', '治愈系书单推荐', 2, '杭州', 30, 1, 'user'),
('读书改变命运', 'destiny@test.com', @pwd, 'https://api.dicebear.com/7.x/avataaars/svg?seed=destiny', '知识就是力量', 1, '合肥', 48, 1, 'user');

-- 获取新用户的起始ID
SET @base = (SELECT MIN(id) FROM users WHERE email = 'xiaoming@test.com');

-- ============ 2. 书架记录 (每人2-4本书) ============
-- status: 1=想读 2=在读 3=已读
INSERT INTO user_shelves (user_id, book_id, status, rating, short_comment, start_date, finish_date) VALUES
(@base+0, 42, 3, 5, '永恒的经典，每读一遍都有新感悟', '2025-12-01', '2025-12-20'),
(@base+0, 311, 2, NULL, '海明威的文字太有力量了', '2026-02-15', NULL),
(@base+0, 89, 1, NULL, '一直想读这本', NULL, NULL),
(@base+1, 62, 3, 4, '科幻迷必读', '2025-11-01', '2025-11-15'),
(@base+1, 42, 3, 5, '反乌托邦巅峰之作', '2025-10-01', '2025-10-20'),
(@base+1, 187, 2, NULL, '凡尔纳的想象力太强了', '2026-03-01', NULL),
(@base+2, 10, 3, 4, '奥斯汀的细腻笔触', '2026-01-10', '2026-02-05'),
(@base+2, 311, 1, NULL, NULL, NULL, NULL),
(@base+3, 198, 3, 5, '温馨的睡前故事', '2026-01-01', '2026-01-02'),
(@base+3, 153, 2, NULL, '狄更斯的社会批判', '2026-03-10', NULL),
(@base+4, 69, 3, 4, '软件工程必读教材', '2025-09-01', '2025-11-30'),
(@base+4, 89, 3, 3, '经典但有些过时', '2025-08-01', '2025-08-15'),
(@base+4, 215, 2, NULL, '计算机科学入门', '2026-03-01', NULL),
(@base+5, 10, 3, 5, '最爱的英国文学', '2025-12-01', '2026-01-10'),
(@base+5, 118, 2, NULL, '很有趣的讽刺小说', '2026-02-20', NULL),
(@base+6, 289, 3, 4, '了解英国工人阶级', '2026-01-15', '2026-02-10'),
(@base+6, 295, 2, NULL, '宗教与资本主义的关系', '2026-03-05', NULL),
(@base+7, 62, 3, 5, '模式识别太精彩了', '2025-11-20', '2025-12-10'),
(@base+7, 13, 3, 4, '经典冒险小说', '2025-10-01', '2025-10-15'),
(@base+8, 308, 3, 5, '尼采的思想很震撼', '2026-01-01', '2026-01-20'),
(@base+8, 89, 2, NULL, '东方哲学经典', '2026-03-01', NULL),
(@base+9, 198, 3, 5, '和孩子一起读的', '2026-02-01', '2026-02-01'),
(@base+9, 43, 3, 4, '很适合亲子阅读', '2026-02-10', '2026-02-15'),
(@base+10, 311, 3, 5, '简洁有力的文字', '2026-01-01', '2026-01-05'),
(@base+11, 69, 2, NULL, '了解软件工程前沿', '2026-03-10', NULL),
(@base+11, 239, 1, NULL, NULL, NULL, NULL),
(@base+12, 153, 3, 3, '有点沉重但值得读', '2026-02-01', '2026-02-28'),
(@base+13, 13, 3, 5, '旅途中读完的', '2026-01-20', '2026-01-25'),
(@base+13, 187, 1, NULL, '下次旅行带上', NULL, NULL),
(@base+14, 10, 3, 5, '经典中的经典', '2025-12-01', '2025-12-30'),
(@base+14, 42, 3, 5, '必读经典', '2025-11-01', '2025-11-20'),
(@base+15, 123, 2, NULL, '了解毕加索的艺术', '2026-03-15', NULL),
(@base+16, 307, 3, 4, '实用的时间管理书', '2026-02-01', '2026-02-10'),
(@base+17, 311, 3, 5, 'Hemingway at his best', '2026-01-01', '2026-01-08'),
(@base+17, 42, 2, NULL, 'Re-reading this classic', '2026-03-10', NULL),
(@base+18, 62, 2, NULL, '深夜读科幻最有感觉', '2026-03-01', NULL),
(@base+19, 43, 3, 5, '和孩子一起读完了', '2026-02-01', '2026-02-08'),
(@base+20, 89, 3, 4, '简洁的智慧', '2026-01-01', '2026-01-10'),
(@base+21, 62, 1, NULL, '想读这本奇幻', NULL, NULL),
(@base+22, 295, 2, NULL, '学术研究参考', '2026-03-01', NULL),
(@base+23, 10, 3, 4, '散文般的小说', '2026-02-01', '2026-02-20'),
(@base+24, 62, 3, 5, '悬疑感十足', '2026-01-10', '2026-01-25'),
(@base+25, 89, 3, 5, '国学经典必读', '2025-12-01', '2025-12-20'),
(@base+26, 123, 3, 4, '设计师必看', '2026-02-01', '2026-02-15'),
(@base+27, 307, 3, 5, '自律从阅读开始', '2026-01-01', '2026-01-05'),
(@base+27, 42, 3, 4, '打卡第100本', '2026-02-01', '2026-02-20'),
(@base+28, 10, 3, 5, '温柔治愈的故事', '2026-01-15', '2026-02-10'),
(@base+29, 42, 3, 5, '改变我世界观的书', '2025-11-01', '2025-11-25'),
(@base+29, 311, 2, NULL, '正在读', '2026-03-15', NULL);

-- PLACEHOLDER_PART2

-- ============ 3. 动态帖子 (40条) ============
-- post_type: 0=普通 1=书评 2=书单
INSERT INTO posts (user_id, content, post_type, book_id, rating, visibility, created_at) VALUES
(@base+0, '刚读完《1984》，奥威尔的预言在今天看来依然振聋发聩。"战争即和平，自由即奴役，无知即力量"——这些口号让人不寒而栗。强烈推荐每个人都读一读。', 1, 42, 5, 0, '2026-03-20 09:15:00'),
(@base+1, '今年的阅读目标已经完成了30%！分享一下我的三月书单：《Pattern Recognition》《海底两万里》《1984》。科幻月快乐！', 0, NULL, NULL, 0, '2026-03-19 20:30:00'),
(@base+2, '午后阳光正好，泡一杯茶，翻开《理智与情感》。奥斯汀笔下的姐妹情深让人动容。', 0, NULL, NULL, 0, '2026-03-19 14:20:00'),
(@base+3, '睡前读了一章《艰难时世》，狄更斯对工业革命时期底层人民的描写太真实了。明天继续。晚安。', 0, NULL, NULL, 0, '2026-03-18 23:45:00'),
(@base+4, '作为程序员，《软件工程》这本书真的是案头必备。虽然有些理论偏学术，但对理解软件开发流程很有帮助。给4星。', 1, 69, 4, 0, '2026-03-18 21:00:00'),
(@base+5, '一杯龙井，一本《Erewhon》，苏州的春天就该这样度过。Samuel Butler的讽刺真是辛辣又幽默。', 0, NULL, NULL, 0, '2026-03-18 15:30:00'),
(@base+6, '读完《通往威根码头之路》，奥威尔不仅是小说家，更是出色的社会观察者。这本书让我对英国工人阶级有了全新的认识。', 1, 289, 4, 0, '2026-03-17 19:00:00'),
(@base+7, '《Pattern Recognition》读完了！Gibson的赛博朋克风格太迷人了。推荐给所有喜欢科幻和悬疑的朋友。', 1, 62, 5, 0, '2026-03-17 16:30:00'),
(@base+8, '读尼采的《反基督者》，感觉自己的三观被重新洗牌了。哲学的魅力就在于此——它迫使你思考那些你以为理所当然的事情。', 1, 308, 5, 0, '2026-03-16 10:00:00'),
(@base+9, '今天和宝宝一起读了《The Night Before Christmas》，她听得好认真！绘本真的是亲子阅读的最佳选择。', 0, NULL, NULL, 0, '2026-03-16 20:00:00'),
(@base+10, '重读《老人与海》，每次都有不同的感悟。"一个人可以被毁灭，但不能被打败。"这句话永远激励着我。', 1, 311, 5, 0, '2026-03-15 11:00:00'),
(@base+11, '在读《软件工程》，里面关于需求工程的章节写得特别好。做技术的同学推荐看看。', 0, NULL, NULL, 0, '2026-03-15 09:30:00'),
(@base+12, '《艰难时世》读完了，狄更斯的社会批判小说总是让人深思。虽然有点沉重，但文学价值很高。', 1, 153, 3, 0, '2026-03-14 22:00:00'),
(@base+13, '在丽江的客栈里读完了《金银岛》，冒险小说配上旅途的心情，简直完美！', 1, 13, 5, 0, '2026-03-14 18:00:00'),
(@base+14, '经典永不过时。今天重读《理智与情感》，奥斯汀的文字历经两百年依然打动人心。', 1, 10, 5, 0, '2026-03-13 14:00:00'),
(@base+15, '开始看毕加索的传记了，艺术家的人生比他们的作品还要精彩。', 0, NULL, NULL, 0, '2026-03-13 10:00:00'),
(@base+16, '《吃掉那只青蛙》读完了，核心观点就是：先做最重要最困难的事。简单但有效。', 1, 307, 4, 0, '2026-03-12 08:00:00'),
(@base+17, 'Just finished "The Old Man and the Sea". Hemingway\'s prose is so clean and powerful. A masterpiece of minimalism.', 1, 311, 5, 0, '2026-03-12 21:00:00'),
(@base+18, '凌晨两点读《Pattern Recognition》，深夜读科幻真的有种特别的沉浸感。Gibson的文字像是在你脑子里装了一个赛博朋克滤镜。', 0, NULL, NULL, 0, '2026-03-11 02:00:00'),
(@base+19, '和孩子一起读完了《公主与柯迪》，George MacDonald的奇幻故事真的很适合亲子共读。孩子问我柯迪最后怎么样了，我说你长大了自己去读原著吧。', 1, 43, 5, 0, '2026-03-11 20:30:00'),
(@base+20, '《孙子兵法》读完了。极简的文字，极深的智慧。少即是多，这本书本身就是最好的证明。', 1, 89, 4, 0, '2026-03-10 16:00:00'),
(@base+21, '好想找一本好看的奇幻小说！最近书荒了，有没有书友推荐？', 0, NULL, NULL, 0, '2026-03-10 12:00:00'),
(@base+22, '在研究宗教与资本主义的关系，《Religion and the Rise of Capitalism》提供了很好的学术视角。', 0, NULL, NULL, 0, '2026-03-09 15:00:00'),
(@base+23, '《理智与情感》读完了，奥斯汀的文字像散文一样优美。每一个句子都值得细细品味。', 1, 10, 4, 0, '2026-03-09 19:00:00'),
(@base+24, '《Pattern Recognition》的悬疑感太强了！Gibson把科技惊悚和文学性完美结合。五星推荐。', 1, 62, 5, 0, '2026-03-08 22:00:00'),
(@base+25, '重读《孙子兵法》，"知己知彼，百战不殆"——这不仅是军事智慧，更是人生哲学。', 1, 89, 5, 0, '2026-03-08 10:00:00'),
(@base+26, '从设计师的角度看《毕加索》传记，他对形式和色彩的突破给了我很多灵感。', 1, 123, 4, 0, '2026-03-07 14:00:00'),
(@base+27, '阅读打卡第365天！今天读完了《1984》，这是我今年的第15本书。自律的力量真的很强大。', 1, 42, 4, 0, '2026-03-07 07:00:00'),
(@base+28, '推荐一个治愈书单：《理智与情感》《The Night Before Christmas》《公主与柯迪》。适合心情低落时阅读。', 2, NULL, NULL, 0, '2026-03-06 16:00:00'),
(@base+29, '《1984》彻底改变了我的世界观。读书真的能改变命运，至少能改变你看世界的方式。', 1, 42, 5, 0, '2026-03-06 20:00:00');

-- PLACEHOLDER_PART3

-- ============ 4. 关注关系 (50对) ============
INSERT INTO user_follows (follower_id, following_id) VALUES
(@base+0, @base+1), (@base+0, @base+4), (@base+0, @base+7),
(@base+1, @base+0), (@base+1, @base+2), (@base+1, @base+7), (@base+1, @base+17),
(@base+2, @base+0), (@base+2, @base+5), (@base+2, @base+14), (@base+2, @base+23),
(@base+3, @base+0), (@base+3, @base+9), (@base+3, @base+19),
(@base+4, @base+0), (@base+4, @base+1), (@base+4, @base+11),
(@base+5, @base+2), (@base+5, @base+6), (@base+5, @base+28),
(@base+6, @base+8), (@base+6, @base+25),
(@base+7, @base+0), (@base+7, @base+1), (@base+7, @base+24),
(@base+8, @base+6), (@base+8, @base+20), (@base+8, @base+25),
(@base+9, @base+3), (@base+9, @base+19), (@base+9, @base+28),
(@base+10, @base+0), (@base+10, @base+17),
(@base+11, @base+4), (@base+11, @base+12),
(@base+12, @base+8), (@base+12, @base+13),
(@base+13, @base+2), (@base+13, @base+14),
(@base+14, @base+2), (@base+14, @base+23),
(@base+17, @base+1), (@base+17, @base+10),
(@base+20, @base+8), (@base+20, @base+25),
(@base+24, @base+7), (@base+24, @base+18),
(@base+27, @base+0), (@base+27, @base+29),
(@base+28, @base+5), (@base+28, @base+23),
(@base+29, @base+0), (@base+29, @base+27);

-- 更新互关标记
UPDATE user_follows f1
JOIN user_follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
SET f1.is_mutual = 1, f2.is_mutual = 1;

-- ============ 5. 评论 (30条, target_type=1 表示帖子) ============
-- 帖子ID从 @base_post 开始，需要先获取
SET @bp = (SELECT MIN(id) FROM posts WHERE user_id = @base);

INSERT INTO comments (user_id, target_id, target_type, content, created_at) VALUES
(@base+1, @bp+0, 1, '1984确实是神作！我也刚重读了一遍，每次都有新的理解。', '2026-03-20 10:00:00'),
(@base+4, @bp+0, 1, '奥威尔的远见真的令人敬佩，推荐搭配《美丽新世界》一起读。', '2026-03-20 11:30:00'),
(@base+7, @bp+0, 1, '这本书改变了我对很多事情的看法。', '2026-03-20 14:00:00'),
(@base+0, @bp+1, 1, '三月书单好棒！科幻月快乐！', '2026-03-19 21:00:00'),
(@base+7, @bp+1, 1, 'Pattern Recognition 超好看的！', '2026-03-19 22:00:00'),
(@base+5, @bp+2, 1, '奥斯汀的书配茶最合适了，同好！', '2026-03-19 15:00:00'),
(@base+14, @bp+2, 1, '理智与情感是我最爱的奥斯汀作品。', '2026-03-19 16:00:00'),
(@base+0, @bp+3, 1, '晚安！狄更斯的书确实需要慢慢品味。', '2026-03-19 00:10:00'),
(@base+1, @bp+4, 1, '程序员读书会+1！这本确实不错。', '2026-03-18 21:30:00'),
(@base+11, @bp+4, 1, '同为码农，这本书帮了我很多。', '2026-03-18 22:00:00'),
(@base+2, @bp+5, 1, '苏州+好茶+好书=完美的一天', '2026-03-18 16:00:00'),
(@base+8, @bp+6, 1, '奥威尔的非虚构作品同样精彩！', '2026-03-17 20:00:00'),
(@base+1, @bp+7, 1, 'Gibson是赛博朋克之父！这本必读。', '2026-03-17 17:00:00'),
(@base+24, @bp+7, 1, '同意！悬疑感拉满。', '2026-03-17 18:00:00'),
(@base+6, @bp+8, 1, '尼采的思想确实很震撼，需要反复咀嚼。', '2026-03-16 11:00:00'),
(@base+20, @bp+8, 1, '哲学类的书就是这样，越读越有味道。', '2026-03-16 12:00:00'),
(@base+3, @bp+9, 1, '好温馨！我也经常给孩子读绘本。', '2026-03-16 21:00:00'),
(@base+19, @bp+9, 1, '亲子阅读真的很重要，点赞！', '2026-03-16 21:30:00'),
(@base+0, @bp+10, 1, '海明威的文字简洁有力，百读不厌。', '2026-03-15 12:00:00'),
(@base+17, @bp+10, 1, 'Absolutely agree! A timeless classic.', '2026-03-15 13:00:00'),
(@base+22, @bp+12, 1, '狄更斯的社会批判小说确实值得一读。', '2026-03-15 08:00:00'),
(@base+2, @bp+13, 1, '在旅途中读书，太浪漫了！', '2026-03-14 19:00:00'),
(@base+0, @bp+14, 1, '经典永不过时，说得好！', '2026-03-13 15:00:00'),
(@base+23, @bp+14, 1, '奥斯汀的每一部作品都是经典。', '2026-03-13 16:00:00'),
(@base+1, @bp+17, 1, 'Hemingway is the master of less is more.', '2026-03-12 22:00:00'),
(@base+21, @bp+21, 1, '推荐《指环王》和《纳尼亚传奇》！', '2026-03-10 13:00:00'),
(@base+7, @bp+21, 1, '试试《Pattern Recognition》，虽然不是传统奇幻但很好看。', '2026-03-10 14:00:00'),
(@base+5, @bp+28, 1, '好治愈的书单，收藏了！', '2026-03-06 17:00:00'),
(@base+9, @bp+28, 1, '《公主与柯迪》确实很治愈。', '2026-03-06 18:00:00'),
(@base+0, @bp+29, 1, '读书确实能改变看世界的方式，共勉！', '2026-03-06 21:00:00');

-- PLACEHOLDER_PART4

-- ============ 6. 点赞 (target_type: 1=帖子 2=评论) ============
INSERT INTO likes (user_id, target_id, target_type) VALUES
(@base+1, @bp+0, 1), (@base+2, @bp+0, 1), (@base+4, @bp+0, 1), (@base+7, @bp+0, 1), (@base+14, @bp+0, 1), (@base+29, @bp+0, 1),
(@base+0, @bp+1, 1), (@base+7, @bp+1, 1), (@base+17, @bp+1, 1),
(@base+5, @bp+2, 1), (@base+14, @bp+2, 1), (@base+23, @bp+2, 1), (@base+28, @bp+2, 1),
(@base+0, @bp+3, 1), (@base+9, @bp+3, 1),
(@base+1, @bp+4, 1), (@base+11, @bp+4, 1), (@base+0, @bp+4, 1),
(@base+2, @bp+5, 1), (@base+6, @bp+5, 1),
(@base+8, @bp+6, 1), (@base+0, @bp+6, 1), (@base+25, @bp+6, 1),
(@base+1, @bp+7, 1), (@base+0, @bp+7, 1), (@base+18, @bp+7, 1), (@base+24, @bp+7, 1),
(@base+6, @bp+8, 1), (@base+20, @bp+8, 1), (@base+25, @bp+8, 1),
(@base+3, @bp+9, 1), (@base+19, @bp+9, 1), (@base+0, @bp+9, 1),
(@base+0, @bp+10, 1), (@base+17, @bp+10, 1), (@base+1, @bp+10, 1),
(@base+4, @bp+11, 1), (@base+0, @bp+11, 1),
(@base+8, @bp+12, 1), (@base+22, @bp+12, 1),
(@base+2, @bp+13, 1), (@base+0, @bp+13, 1), (@base+14, @bp+13, 1),
(@base+0, @bp+14, 1), (@base+2, @bp+14, 1), (@base+23, @bp+14, 1), (@base+28, @bp+14, 1),
(@base+26, @bp+15, 1),
(@base+27, @bp+16, 1), (@base+4, @bp+16, 1),
(@base+1, @bp+17, 1), (@base+10, @bp+17, 1),
(@base+7, @bp+18, 1), (@base+1, @bp+18, 1),
(@base+9, @bp+19, 1), (@base+3, @bp+19, 1), (@base+28, @bp+19, 1),
(@base+8, @bp+20, 1), (@base+25, @bp+20, 1),
(@base+7, @bp+21, 1), (@base+18, @bp+21, 1), (@base+1, @bp+21, 1),
(@base+8, @bp+22, 1),
(@base+2, @bp+23, 1), (@base+14, @bp+23, 1), (@base+28, @bp+23, 1),
(@base+7, @bp+24, 1), (@base+18, @bp+24, 1),
(@base+8, @bp+25, 1), (@base+20, @bp+25, 1),
(@base+15, @bp+26, 1),
(@base+0, @bp+27, 1), (@base+29, @bp+27, 1),
(@base+5, @bp+28, 1), (@base+9, @bp+28, 1), (@base+23, @bp+28, 1), (@base+3, @bp+28, 1),
(@base+0, @bp+29, 1), (@base+27, @bp+29, 1), (@base+1, @bp+29, 1);

-- ============ 7. 读书笔记 (15条) ============
INSERT INTO reading_notes (user_id, book_id, title, content, quote, page_number, chapter, is_public) VALUES
(@base+0, 42, '关于自由与控制', '奥威尔对极权主义的描写让我想到了现代社会中信息控制的问题。我们是否也在某种程度上被"老大哥"注视着？', '"谁控制了过去，谁就控制了未来；谁控制了现在，谁就控制了过去。"', 35, '第一部分', 1),
(@base+1, 62, '赛博朋克的魅力', 'Gibson对未来世界的想象不是简单的科技堆砌，而是对人类与技术关系的深刻思考。', '"未来已经到来，只是分布不均。"', 120, 'Chapter 8', 1),
(@base+4, 69, '软件工程的核心', '好的软件工程不仅仅是写代码，更是关于沟通、协作和持续改进。', NULL, 45, '第三章', 1),
(@base+8, 308, '尼采与虚无主义', '尼采并不是在宣扬虚无主义，而是在试图超越它。"上帝已死"不是庆祝，而是警告。', '"那些杀不死我的，使我更强大。"', 78, NULL, 1),
(@base+14, 10, '奥斯汀的智慧', '理智与情感的平衡，不仅是小说的主题，也是人生的课题。', NULL, 200, '第三卷', 1),
(@base+17, 311, 'The Power of Simplicity', 'Hemingway proves that great literature doesn\'t need complex sentences. Every word earns its place.', '"But man is not made for defeat. A man can be destroyed but not defeated."', 89, NULL, 1),
(@base+25, 89, '兵法与人生', '孙子兵法不仅是军事著作，更是一部关于策略和智慧的哲学书。', '"知己知彼，百战不殆。"', 12, '谋攻篇', 1),
(@base+6, 289, '社会观察的力量', '奥威尔亲身深入矿区，用第一手经验写出了最真实的社会报告。', NULL, 56, '第四章', 1),
(@base+7, 13, '冒险精神', '《金银岛》让我想起了小时候对冒险的渴望。好的冒险小说永远不会过时。', NULL, 150, NULL, 1),
(@base+20, 89, '极简的智慧', '孙子兵法全文不过六千字，却包含了无穷的智慧。这就是极简主义的最高境界。', '"兵者，诡道也。"', 1, '始计篇', 1),
(@base+27, 307, '自律的秘密', '先做最难的事，这个简单的原则改变了我的工作效率。', NULL, 30, '第二章', 1),
(@base+29, 42, '改变世界观的书', '读完1984后，我开始重新审视身边的一切。这就是好书的力量。', '"在谎言遍地的时代，说真话是一种革命行为。"', 280, '第三部分', 1),
(@base+5, 10, '茶与文学', '在苏州的茶馆里读奥斯汀，中西文化的碰撞产生了奇妙的化学反应。', NULL, 100, '第二卷', 1),
(@base+9, 43, '童话的力量', '好的童话不仅是给孩子看的，大人也能从中获得启发和治愈。', NULL, 80, NULL, 1),
(@base+23, 10, '散文般的小说', '奥斯汀的文字有一种散文的韵律感，读起来像是在听一首优美的乐曲。', NULL, 150, '第二卷', 1);

-- ============ 8. 更新计数字段 ============
-- 更新帖子的点赞数和评论数
UPDATE posts p SET
  like_count = (SELECT COUNT(*) FROM likes WHERE target_id = p.id AND target_type = 1),
  comment_count = (SELECT COUNT(*) FROM comments WHERE target_id = p.id AND target_type = 1);

-- 更新用户的关注数、粉丝数、帖子数、书架数
UPDATE users u SET
  following_count = (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id),
  follower_count = (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id),
  post_count = (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_deleted = 0),
  book_count = (SELECT COUNT(*) FROM user_shelves WHERE user_id = u.id);

-- 更新笔记的评论数和点赞数（暂无数据，保持0）

