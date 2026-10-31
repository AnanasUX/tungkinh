/**
 * Chùa An Nhiên - Kho Tàng Lời Phật Dạy (Pháp Cú), 12 Quẻ Xăm Từ Bi & Sớ Điệp
 */

const DHARMA_MOOD_WISDOM = {
  anxious: [
    {
      verse: "Không có nỗi sợ nào cho người tâm không vướng bận. Khi tâm an trú nơi chánh niệm, sóng gió cuộc đời chỉ như bọt nước trôi sông.",
      source: "Kinh Pháp Cú (Dhammapada - Phẩm Tâm)",
      practice: "Hãy thở chậm 3 hơi thật sâu. Nhận biết thân đang ngồi yên, tâm đang quan sát. Nhắc nhở mình: 'Hiện tại này tôi đang an toàn'."
    },
    {
      verse: "Quá khứ đã qua, tương lai thì chưa đến. Chỉ có khoảnh khắc này là thật. An trú trong hơi thở hiện tại, mọi âu lo liền tiêu tan.",
      source: "Kinh Nhất Dạ Hiền Giả (Bhaddekaratta Sutta)",
      practice: "Gõ mõ 3 tiếng, cảm nhận từng âm vang tan dần vào thinh không, buông bỏ mọi toan tính về ngày mai."
    }
  ],
  angry: [
    {
      verse: "Lấy oán báo oán, oán ấy chẳng bao giờ dứt. Chỉ có từ bi mới hóa giải được hận thù. Đó là định luật ngàn đời.",
      source: "Kinh Pháp Cú - Kệ số 5",
      practice: "Nhắm mắt lại, đặt tay lên ngực. Tự nói với chính mình: 'Tôi thương xót cho nỗi khổ của người ấy, cũng như xót thương nỗi khổ của chính tôi'."
    },
    {
      verse: "Người ôm lòng giận dữ giống như kẻ cầm hòn than rực đỏ định ném vào người khác; kẻ bị bỏng tay trước tiên chính là mình.",
      source: "Lời Phật Dạy (Tương Ưng Bộ Kinh)",
      practice: "Thỉnh một tiếng Đại Hồng Chung. Lắng nghe tiếng ngân tan ra và tưởng tượng cơn giận như khói bay đi."
    }
  ],
  sad: [
    {
      verse: "Vạn pháp do duyên sinh, cũng do duyên mà diệt. Hiểu được vô thường, lòng sẽ thôi trách cứ chia ly và mất mát.",
      source: "Kinh Đại Bát Niết Bàn",
      practice: "Thắp một nén tâm hương. Hương thơm lan tỏa rồi tan biến, nhắc nhở ta trân quý hiện tại mà không bám chấp."
    },
    {
      verse: "Bùn lầy hôi tanh là nơi nuôi dưỡng đóa sen thơm ngát. Mọi khổ đau trong đời chính là chất liệu để nở hoa giác ngộ.",
      source: "Thiền Sư Nhất Hạnh · Trái Tim Của Bụt",
      practice: "Ngắm nhìn đài sen nơi Đức Thế Tôn tọa thiền, gửi gắm niềm đau vào lòng từ bi của chư Phật."
    }
  ],
  tired: [
    {
      verse: "Dừng lại, thở và mỉm cười. Con thuyền căng buồm mãi sẽ rách, dây đàn quá căng sẽ đứt. Nghỉ ngơi cũng là một phần của sự tu tập.",
      source: "Kinh Giáo Giới Nan-đà",
      practice: "Thả lỏng toàn bộ cơ thể từ đỉnh đầu đến gót chân. Ngồi yên 5 phút không suy nghĩ, chỉ cảm nhận nhịp tim và hơi thở."
    },
    {
      verse: "Tâm buông xả là ngôi nhà bình yên nhất. Gánh nặng cuộc đời chỉ nặng khi ta còn cố nắm giữ.",
      source: "Kinh Pháp Cú - Phẩm Hạnh Phúc",
      practice: "Uống một ngụm nước ấm trong chánh niệm, cảm nhận sự sống tươi mát đang nuôi dưỡng từng tế bào."
    }
  ],
  peace: [
    {
      verse: "Hạnh phúc không nằm ở cuối con đường, hạnh phúc chính là từng bước chân an lạc trên con đường ấy.",
      source: "Kinh Pháp Cú",
      practice: "Tụng một biến Bát Nhã Tâm Kinh, thấy năm uẩn đều Không, lòng thanh thản nhẹ tênh."
    },
    {
      verse: "Chiến thắng vạn quân không bằng tự chiến thắng chính mình. Người tự thắng mình là chiến sĩ oanh liệt nhất.",
      source: "Kinh Pháp Cú - Kệ số 103",
      practice: "Lễ Phật 3 lạy với lòng biết ơn Tam Bảo và chính sự hiện diện của mình hôm nay."
    }
  ],
  grateful: [
    {
      verse: "Ơn cha mẹ sâu dày như biển lớn, ơn Tam Bảo sáng soi đường giải thoát, ơn chúng sanh vạn loại cùng tương tức tương sinh.",
      source: "Kinh Báo Hiếu Phụ Mẫu Trọng Ân",
      practice: "Hồi hướng công đức tu tập hôm nay cho cha mẹ hiện tiền được tăng long phước thọ, cha mẹ quá vãng được sanh cõi an lành."
    }
  ]
};

const SACRED_ORACLES_12 = [
  {
    num: "Quẻ Số 01 · Thượng Thượng Cát",
    title: "Hoa Sen Nở Rộ Giữa Hồ Thu",
    poem: "Tâm thành một nén hương trầm tỏa,\nPhúc lộc mười phương tự tìm về.\nGia đạo bình an thêm hưng thịnh,\nCông thành danh toại rạng tiền đồ.",
    career: "Rất hanh thông, công việc làm ăn phát đạt, có quý nhân lớn nâng đỡ.",
    family: "Gia đạo hòa thuận, con cháu hiếu thảo, đón hỷ sự bất ngờ.",
    health: "Thân tâm khang kiện, bệnh cũ thuyên giảm, tinh thần thư thái.",
    advice: "Mọi việc mong cầu đều đại cát. Giữ tâm khiêm hạ, năng làm việc thiện thì phúc trạch bền lâu muôn đời."
  },
  {
    num: "Quẻ Số 02 · Đại Cát Khánh",
    title: "Vầng Trăng Tròn Chiếu Đỉnh Non",
    poem: "Trời thu gió mát trăng vằng vặc,\nChiếu rọi trần gian sáng diệu kỳ.\nĐường xa vạn dặm không ngăn ngại,\nCát tường như ý chẳng nghĩ suy.",
    career: "Mọi dự định sắp tới đều đạt thành quả như ý, thi cử đỗ đạt cao.",
    family: "Trong nhà thêm người thêm của, sum vầy ấm cúng.",
    health: "Tràn đầy sinh lực, giấc ngủ an lành.",
    advice: "Thời cơ chín muồi, hãy tự tin thực hiện các kế hoạch thiện lành đã ấp ủ."
  },
  {
    num: "Quẻ Số 03 · Trung Cát",
    title: "Nước Suối Trong Chảy Qua Khe Đá",
    poem: "Dòng suối quanh co qua ghềnh đá,\nVẫn giữ lòng trong chảy về khơi.\nKiên trì bền chí ắt nên nghiệp,\nThanh nhàn vui thú chốn thảnh thơi.",
    career: "Ban đầu hơi chậm, cần kiên nhẫn tích lũy kinh nghiệm, về sau đại phát.",
    family: "Cần lắng nghe thấu hiểu nhau hơn, tránh nóng vội lời nói.",
    health: "Chú ý dưỡng sinh, chớ thức khuya làm việc quá sức.",
    advice: "Học hạnh của nước: mềm mại, uyển chuyển vượt qua mọi chướng ngại."
  },
  {
    num: "Quẻ Số 04 · Thượng Cát",
    title: "Cây Bồ Đề Tươi Tốt Rợp Bóng",
    poem: "Bồ Đề rợp bóng mát mười phương,\nChe chở muôn sinh khỏi nắng sương.\nPhước đức gieo mầm nay đơm quả,\nAn lành chiếu sáng vạn nẻo đường.",
    career: "Được tập thể kính trọng, có quý nhân phương xa giúp đỡ công việc.",
    family: "Tổ tiên phù hộ, dòng họ rạng danh.",
    health: "Tránh suy nghĩ vu vơ, tâm an thì bệnh tật tự lui.",
    advice: "Năng giúp đỡ người khó khăn, mở rộng lòng từ bi như bóng mát cây đại thụ."
  },
  {
    num: "Quẻ Số 05 · Đại An",
    title: "Gió Mát Thổi Tan Mây Mù",
    poem: "Mây mờ trôi hết trời trong vắt,\nÁnh sáng bình minh rực khắp nơi.\nChông gai thử thách qua rồi đó,\nNụ cười rạng rỡ đón duyên tươi.",
    career: "Những bế tắc hiểu lầm vừa qua sẽ được giải tỏa nhanh chóng.",
    family: "Người đi xa có tin mừng gửi về, gia đình đoàn viên.",
    health: "Hồi phục rất tốt sau thời gian mệt mỏi.",
    advice: "Buông bỏ chuyện cũ, mở lòng đón nhận những khởi đầu tươi sáng."
  },
  {
    num: "Quẻ Số 06 · Cát Tường",
    title: "Đàn Chim Trắng Bay Về Tổ Ấm",
    poem: "Chiều buông chim trắng lượn từng đàn,\nTìm về chốn cũ hưởng bình an.\nTrần gian sóng gió nay dừng bước,\nCửa Phật từ bi ngát hương nhàn.",
    career: "Ổn định vững chắc, không nên mạo hiểm đầu tư liều lĩnh.",
    family: "Ấm êm, tình cảm vợ chồng keo sơn gắn bó.",
    health: "Thân thể nhẹ nhàng, ăn ngon ngủ yên.",
    advice: "Biết đủ là giàu, biết dừng là an. Trân quý những gì đang có trong tầm tay."
  },
  {
    num: "Quẻ Số 07 · Thượng Thượng",
    title: "Ánh Kim Quang Chiếu Soi Vạn Cõi",
    poem: "Đức Phật Thế Tôn phóng hào quang,\nCứu vớt trần gian dứt bẽ bàng.\nTâm thiện gieo nhân nay hái quả,\nMuôn đời phước lộc tỏa miên man.",
    career: "Đỉnh cao tài lộc, mở mang bờ cõi làm ăn cực kỳ thuận lợi.",
    family: "Gia đình hiển vinh, tiếng thơm lưu truyền.",
    health: "Khỏe mạnh, sống lâu thọ trường.",
    advice: "Hồi hướng công đức cho khắp pháp giới, phát tâm cúng dường Tam Bảo."
  },
  {
    num: "Quẻ Số 08 · Đại An Cát Khánh",
    title: "Trăng Sáng Soi Đường Vạn Dặm Xa",
    poem: "Mây tan trăng sáng chiếu muôn nơi,\nSức khỏe dồi dào nở nụ cười.\nSự nghiệp vững vàng như tùng bách,\nBình an hạnh phúc trọn niềm vui.",
    career: "Rất tốt cho công danh, học tập thi cử và chuyển đổi việc làm.",
    family: "Hỷ khí đầy nhà, con cái ngoan ngoãn thành đạt.",
    health: "An vui, tâm không còn vướng bận phiền muộn.",
    advice: "Tiếp tục giữ gìn năm giới, nói lời hòa ái dịu dàng."
  },
  {
    num: "Quẻ Số 09 · Hỷ Khánh",
    title: "Sen Hồng Dâng Trước Phật Đài",
    poem: "Hoa sen tươi thắm dâng đài Phật,\nKhói tỏa hương trầm quyện gió bay.\nCầu xin chư Phật ban ân huệ,\nTâm nguyện ấp ủ sớm thành ngay.",
    career: "Gặp được đối tác trung thực, hợp tác đôi bên cùng có lợi.",
    family: "Được bạn bè người thân thương yêu ủng hộ hết lòng.",
    health: "Tràn đầy năng lượng tích cực.",
    advice: "Thành tâm cầu nguyện ắt có linh ứng nhiệm mầu."
  },
  {
    num: "Quẻ Số 10 · Bình An Cát Lợi",
    title: "Thuyền Bát Nhã Vượt Trùng Dương",
    poem: "Thuyền từ Bát Nhã lướt phong ba,\nĐưa khách trần ai cập bến hoa.\nTâm vững tay chèo không lạc lối,\nBình yên cập bến ngát hương trà.",
    career: "Vượt qua thử thách ngoạn mục nhờ trí tuệ và sự bình tĩnh.",
    family: "Hóa giải được các mối bất hòa xưa cũ.",
    health: "Cần chú ý giữ ấm phổi và cổ họng mùa lạnh.",
    advice: "Nương tựa vào chánh pháp, lấy trí tuệ làm ngọn đèn soi đường."
  },
  {
    num: "Quẻ Số 11 · Viên Mãn",
    title: "Tâm Thiện Lành Gieo Quả Ngọt",
    poem: "Hạt giống từ bi gieo bấy nay,\nTrổ cành xanh lá quả sum suê.\nTrời ban phúc hậu người nhân đức,\nTrọn vẹn tình thương lối trở về.",
    career: "Được thưởng lớn, cất nhắc vị trí xứng đáng với công sức bỏ ra.",
    family: "Tràn ngập tiếng cười hạnh phúc của người thân.",
    health: "Khí huyết lưu thông, sắc mặt hồng hào.",
    advice: "Luôn ghi nhớ công ơn người giúp đỡ mình lúc khó khăn."
  },
  {
    num: "Quẻ Số 12 · Khai Huệ",
    title: "Tiếng Chuông Phá Tan Màn Vô Minh",
    poem: "Chuông chùa sớm điểm vọng hư không,\nThức tỉnh trần gian giấc mộng nồng.\nNhìn thấu muôn sự lòng thanh thản,\nTrăng vàng phẳng lặng đáy hồ trong.",
    career: "Sáng suốt trong các quyết định ký kết, tài chính vững vàng.",
    family: "An nhiên tự tại trước mọi biến đổi của ngoại cảnh.",
    health: "Tâm bình khí hòa, sống thảnh thơi an nhàn.",
    advice: "Dành thời gian tọa thiền mỗi ngày, lắng nghe tiếng chuông u minh định tâm."
  }
];

window.DHARMA_MOOD_WISDOM = DHARMA_MOOD_WISDOM;
window.SACRED_ORACLES_12 = SACRED_ORACLES_12;
